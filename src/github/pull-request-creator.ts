import * as core from '@actions/core';
import * as github from '@actions/github';

import type { CommandRunner } from '../command-runner.js';
import type { GitRepository } from '../git/git-repository.js';
import type { MiseUpgrader } from '../mise/mise-upgrader.js';
import type { ToolVersionChange } from '../mise/tool-version-changelog.js';
import { ToolVersionChangelog } from '../mise/tool-version-changelog.js';
import type { CreatePullRequestOptions, GitActor } from '../types.js';
import { DEFAULT_GIT_ACTOR } from '../types.js';
import { GitHubReleaseNotesFetcher } from './github-release-notes-fetcher.js';
import { truncatePullRequestBody } from './pull-request-body-limits.js';
import { PullRequestTitleBuilder } from './pull-request-title-builder.js';

export class PullRequestCreator {
  private readonly releaseNotesFetcher: GitHubReleaseNotesFetcher;

  constructor(
    private readonly cwd: string,
    private readonly token: string,
    private readonly git: GitRepository,
    private readonly runner: CommandRunner,
    mise: MiseUpgrader,
  ) {
    this.releaseNotesFetcher = new GitHubReleaseNotesFetcher(token, mise);
  }

  static sanitizeBranchSegment(value: string): string {
    return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  static buildBranchName(prefix: string, suffix = ''): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14);
    const segment = suffix ? `${prefix}-${suffix}` : prefix;
    return `${segment}-${timestamp}`;
  }

  static buildBody(
    updatedTools: string[],
    modifiedFiles: string[] = [],
    versionChanges: ToolVersionChange[] = [],
  ): string {
    const toolLines =
      updatedTools.length > 0
        ? updatedTools.map((tool) => `- \`${tool}\``).join('\n')
        : '- all eligible local tools';

    const command =
      updatedTools.length === 1
        ? `mise upgrade --bump --local ${updatedTools[0]}`
        : `mise upgrade --bump --local${updatedTools.length > 0 ? ` ${updatedTools.join(' ')}` : ''}`;

    const sections = [
      'Automated mise tool upgrades from local config.',
      '',
      'Updated tools:',
      toolLines,
      '',
      `Command: \`${command}\``,
    ];

    const changelog = ToolVersionChangelog.formatCollapsible(versionChanges);
    if (changelog) {
      sections.push('', changelog);
    }

    const releaseNotes = ToolVersionChangelog.formatReleaseNotesCollapsible(versionChanges);
    if (releaseNotes) {
      sections.push('', releaseNotes);
    }

    if (modifiedFiles.length > 0) {
      sections.push('', 'Modified files:', ...modifiedFiles.map((file) => `- \`${file}\``));
    }

    return truncatePullRequestBody(sections.join('\n'));
  }

  async create(options: CreatePullRequestOptions): Promise<string> {
    const branchName = PullRequestCreator.buildBranchName(
      options.branchPrefix,
      options.branchSuffix,
    );
    const versionChange = options.versionChanges?.find((change) =>
      options.updatedTools.includes(change.name),
    );
    const title = PullRequestTitleBuilder.resolve(
      options.pullRequestTitle,
      options.updatedTools,
      versionChange,
    );
    const commitAuthor = options.commitAuthor ?? DEFAULT_GIT_ACTOR;
    const modifiedFiles = await this.git.listModifiedFiles();
    const enrichedChanges = await this.releaseNotesFetcher.enrich(options.versionChanges ?? []);
    const body = PullRequestCreator.buildBody(options.updatedTools, modifiedFiles, enrichedChanges);

    return this.createOnBranch(branchName, title, body, modifiedFiles, commitAuthor);
  }

  private async createOnBranch(
    branchName: string,
    title: string,
    body: string,
    modifiedFiles: string[],
    commitAuthor: GitActor,
  ): Promise<string> {
    if (modifiedFiles.length === 0) {
      throw new Error('No modified files to commit.');
    }

    core.info(`Staging modified files: ${modifiedFiles.join(', ')}`);

    const repository = github.context.repo;
    const octokit = github.getOctokit(this.token);
    const remoteUrl = `https://x-access-token:${this.token}@github.com/${repository.owner}/${repository.repo}.git`;

    await this.runner.run('git', ['config', 'user.name', commitAuthor.name], this.cwd);
    await this.runner.run('git', ['config', 'user.email', commitAuthor.email], this.cwd);
    await this.runner.run('git', ['checkout', '-b', branchName], this.cwd);
    await this.runner.run('git', ['add', '--', ...modifiedFiles], this.cwd);
    await this.runner.run('git', ['commit', '-m', title, ...(body ? ['-m', body] : [])], this.cwd);
    await this.runner.run('git', ['remote', 'set-url', 'origin', remoteUrl], this.cwd);
    await this.runner.run(
      'git',
      ['push', '--force-with-lease', 'origin', `HEAD:${branchName}`],
      this.cwd,
    );

    const response = await octokit.rest.pulls.create({
      owner: repository.owner,
      repo: repository.repo,
      head: branchName,
      base: github.context.ref.replace(/^refs\/heads\//, ''),
      title,
      body,
    });

    const pullRequestUrl = response.data.html_url;
    core.info(`Created pull request: ${pullRequestUrl}`);
    return pullRequestUrl;
  }
}

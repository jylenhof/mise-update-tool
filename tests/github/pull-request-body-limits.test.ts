import { describe, expect, it } from 'vitest';

import {
  GITHUB_PULL_REQUEST_BODY_MAX_LENGTH,
  sanitizeGithubMentions,
  truncatePullRequestBody,
  truncateText,
} from '../../src/github/pull-request-body-limits.js';
import { PullRequestCreator } from '../../src/github/pull-request-creator.js';
import { ToolVersionChangelog } from '../../src/mise/tool-version-changelog.js';

describe('pull-request-body-limits', () => {
  it('leaves short text unchanged', () => {
    expect(truncateText('hello', 10)).toBe('hello');
    expect(truncatePullRequestBody('hello')).toBe('hello');
  });

  it('truncates long text with a notice', () => {
    expect(truncateText('hello world this is long', 20)).toBe('hello w… (truncated)');
  });

  it('truncates pull request bodies to GitHub max length', () => {
    const body = 'x'.repeat(GITHUB_PULL_REQUEST_BODY_MAX_LENGTH + 100);
    const truncated = truncatePullRequestBody(body);

    expect(truncated.length).toBeLessThanOrEqual(GITHUB_PULL_REQUEST_BODY_MAX_LENGTH);
    expect(truncated).toContain('65536 character limit');
  });
});

describe('sanitizeGithubMentions', () => {
  const zwsp = '\u200B';

  it('breaks user and team mentions', () => {
    expect(sanitizeGithubMentions('Thanks @alice and @org/maintainers!')).toBe(
      `Thanks @${zwsp}alice and @${zwsp}org/maintainers!`,
    );
  });

  it('breaks mentions at the start of a line', () => {
    expect(sanitizeGithubMentions('@bob fixed a bug')).toBe(`@${zwsp}bob fixed a bug`);
  });

  it('leaves email addresses unchanged', () => {
    expect(sanitizeGithubMentions('Contact user@example.com for help')).toBe(
      'Contact user@example.com for help',
    );
  });

  it('leaves text without mentions unchanged', () => {
    expect(sanitizeGithubMentions('No mentions here')).toBe('No mentions here');
  });
});

describe('ToolVersionChangelog release note limits', () => {
  it('truncates long release note bodies', () => {
    const markdown = ToolVersionChangelog.formatReleaseNotesCollapsible([
      {
        name: 'aube',
        previousRequested: 'latest',
        nextRequested: 'latest',
        previousVersion: '1.0.0',
        nextVersion: '2.0.0',
        releaseNotes: [{ tag: 'v2.0.0', body: 'a'.repeat(5_000) }],
      },
    ]);

    expect(markdown).toContain('… (truncated)');
    expect(markdown.length).toBeLessThan(5_000);
  });

  it('omits older releases beyond the per-tool limit', () => {
    const markdown = ToolVersionChangelog.formatReleaseNotesCollapsible([
      {
        name: 'aube',
        previousRequested: 'latest',
        nextRequested: 'latest',
        previousVersion: '1.0.0',
        nextVersion: '2.0.0',
        releaseNotes: Array.from({ length: 12 }, (_, index) => ({
          tag: `v1.${index}.0`,
          body: `release ${index}`,
        })),
      },
    ]);

    expect(markdown).toContain('v1.11.0');
    expect(markdown).not.toContain('v1.0.0');
    expect(markdown).toContain('_Omitted 2 older releases._');
  });

  it('sanitizes GitHub mentions in release note bodies', () => {
    const markdown = ToolVersionChangelog.formatReleaseNotesCollapsible([
      {
        name: 'aube',
        previousRequested: 'latest',
        nextRequested: 'latest',
        previousVersion: '1.0.0',
        nextVersion: '2.0.0',
        releaseNotes: [
          {
            tag: 'v2.0.0',
            body: 'Thanks @upstream-maintainer for the fix!\nAlso @acme/team.',
          },
        ],
      },
    ]);

    expect(markdown).toContain(`@\u200Bupstream-maintainer`);
    expect(markdown).toContain(`@\u200Bacme/team`);
    expect(markdown).not.toContain('@upstream-maintainer');
    expect(markdown).not.toContain('@acme/team');
  });
});

describe('PullRequestCreator.buildBody limits', () => {
  it('keeps generated bodies within GitHub max length', () => {
    const body = PullRequestCreator.buildBody(
      ['node', 'aube'],
      Array.from({ length: 100 }, (_, index) => `.mise/tool-${index}.toml`),
      Array.from({ length: 20 }, (_, index) => ({
        name: `tool-${index}`,
        previousRequested: '1',
        nextRequested: '2',
        previousVersion: '1.0.0',
        nextVersion: '2.0.0',
        githubRepo: 'org/repo',
        releaseNotes: Array.from({ length: 12 }, (__, releaseIndex) => ({
          tag: `v2.${releaseIndex}.0`,
          body: 'release note '.repeat(500),
        })),
      })),
    );

    expect(body.length).toBeLessThanOrEqual(GITHUB_PULL_REQUEST_BODY_MAX_LENGTH);
  });
});

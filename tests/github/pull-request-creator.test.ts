import * as github from '@actions/github';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PullRequestCreator } from '../../src/github/pull-request-creator.js';
import { createMockRunner } from '../helpers/mocks.js';

describe('PullRequestCreator', () => {
  describe('sanitizeBranchSegment', () => {
    it('normalizes tool names for branch suffixes', () => {
      expect(PullRequestCreator.sanitizeBranchSegment('pipx:copier')).toBe('pipx-copier');
      expect(PullRequestCreator.sanitizeBranchSegment('github:foo/bar')).toBe('github-foo-bar');
    });
  });

  describe('buildBranchName', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-12T12:34:56.789Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('builds branch names with optional suffixes', () => {
      expect(PullRequestCreator.buildBranchName('chore/mise-tool-updates')).toMatch(
        /^chore\/mise-tool-updates-\d{14}$/,
      );
      expect(PullRequestCreator.buildBranchName('prefix', 'node')).toBe(
        'prefix-node-20260712123456',
      );
    });
  });

  describe('buildBody', () => {
    it('builds a body for all eligible tools when none are listed', () => {
      const body = PullRequestCreator.buildBody([], []);
      expect(body).toContain('mise-managed tools:');
      expect(body).toContain('- all eligible local tools');
      expect(body).toContain('`mise upgrade --bump --local`');
    });
  });

  describe('create', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('creates a pull request when modified files exist', async () => {
      const runner = createMockRunner();
      const git = {
        listModifiedFiles: vi.fn().mockResolvedValue(['.mise.toml']),
      };
      const mise = { getToolBackend: vi.fn().mockResolvedValue(null) };
      const creator = new PullRequestCreator(
        '/repo',
        'token',
        git as never,
        runner as never,
        mise as never,
      );

      vi.mocked(github.getOctokit).mockReturnValue({
        rest: {
          pulls: {
            create: vi.fn().mockResolvedValue({
              data: { html_url: 'https://github.com/jdx/mise-update-tool/pull/1' },
            }),
          },
        },
      } as never);

      const url = await creator.create({
        branchPrefix: 'chore/mise-tool-updates',
        updatedTools: ['node'],
        versionChanges: [],
        commitAuthor: { name: 'Jane', email: 'jane@example.com' },
      });

      expect(url).toBe('https://github.com/jdx/mise-update-tool/pull/1');
      expect(runner.run).toHaveBeenCalledWith('git', ['config', 'user.name', 'Jane'], '/repo');
    });

    it('throws when there are no modified files to commit', async () => {
      const git = { listModifiedFiles: vi.fn().mockResolvedValue([]) };
      const creator = new PullRequestCreator(
        '/repo',
        'token',
        git as never,
        createMockRunner() as never,
        { getToolBackend: vi.fn() } as never,
      );

      await expect(
        creator.create({
          branchPrefix: 'chore/mise-tool-updates',
          updatedTools: ['node'],
        }),
      ).rejects.toThrow('No modified files to commit.');
    });
  });
});

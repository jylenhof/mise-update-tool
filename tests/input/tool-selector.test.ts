import { describe, expect, it } from 'vitest';

import { ToolSelector } from '../../src/input/tool-selector.js';

describe('ToolSelector', () => {
  const selector = new ToolSelector();

  describe('parseList', () => {
    it('parses comma and newline separated values', () => {
      expect(selector.parseList('node, aube\nprek')).toEqual(['node', 'aube', 'prek']);
    });

    it('rejects invalid tool names', () => {
      expect(() => selector.parseList('bad tool')).toThrow(/Invalid mise tool name/);
    });
  });

  describe('resolveUpgradeTools', () => {
    const localTools = ['node', 'aube', 'prek'];

    it('returns all local tools except keep entries', () => {
      expect(selector.resolveUpgradeTools(localTools, [], ['prek'])).toEqual(['node', 'aube']);
    });

    it('validates explicit tools against local config', () => {
      expect(selector.resolveUpgradeTools(localTools, ['node'], [])).toEqual(['node']);
      expect(() => selector.resolveUpgradeTools(localTools, ['terraform'], [])).toThrow(
        /Unknown local mise tools/,
      );
    });

    it('validates keep entries against local config', () => {
      expect(() => selector.resolveUpgradeTools(localTools, [], ['terraform'])).toThrow(
        /Unknown local mise tools in keep/,
      );
    });

    it('rejects tools listed in both tools and keep', () => {
      expect(() => selector.resolveUpgradeTools(localTools, ['node'], ['node'])).toThrow(
        /both tools and keep/,
      );
    });
  });

  describe('parsePullRequestStrategy', () => {
    it('accepts single and per-tool values', () => {
      expect(selector.parsePullRequestStrategy('single')).toBe('single');
      expect(selector.parsePullRequestStrategy('')).toBe('single');
      expect(selector.parsePullRequestStrategy('per-tool')).toBe('per-tool');
      expect(selector.parsePullRequestStrategy('multiple')).toBe('per-tool');
    });

    it('rejects unknown strategies', () => {
      expect(() => selector.parsePullRequestStrategy('all-at-once')).toThrow(
        /Invalid pull-request-strategy/,
      );
    });
  });
});

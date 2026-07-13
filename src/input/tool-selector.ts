import type { PullRequestStrategy } from '../types.js';

const TOOL_NAME_PATTERN = /^[A-Za-z0-9:._/@+-]+$/;

export class ToolSelector {
  parseList(value: string): string[] {
    const items = value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const unique = [...new Set(items)];
    for (const item of unique) {
      if (!TOOL_NAME_PATTERN.test(item)) {
        throw new Error(`Invalid mise tool name: ${item}`);
      }
    }

    return unique;
  }

  parsePullRequestStrategy(value: string): PullRequestStrategy {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'single' || normalized === '') {
      return 'single';
    }
    if (normalized === 'per-tool' || normalized === 'per_tool' || normalized === 'multiple') {
      return 'per-tool';
    }
    throw new Error(`Invalid pull-request-strategy: ${value}. Expected "single" or "per-tool".`);
  }

  resolveUpgradeTools(allLocalTools: string[], tools: string[], keep: string[]): string[] {
    const available = new Set(allLocalTools);
    const keepSet = new Set(keep);

    const unknownKeep = keep.filter((tool) => !available.has(tool));
    if (unknownKeep.length > 0) {
      throw new Error(
        `Unknown local mise tools in keep: ${unknownKeep.join(', ')}. Available: ${allLocalTools.join(', ')}`,
      );
    }

    const overlappingKeep = tools.filter((tool) => keepSet.has(tool));
    if (overlappingKeep.length > 0) {
      throw new Error(`Tools cannot appear in both tools and keep: ${overlappingKeep.join(', ')}`);
    }

    if (tools.length > 0) {
      const unknown = tools.filter((tool) => !available.has(tool));
      if (unknown.length > 0) {
        throw new Error(
          `Unknown local mise tools: ${unknown.join(', ')}. Available: ${allLocalTools.join(', ')}`,
        );
      }
      return tools.filter((tool) => !keepSet.has(tool));
    }

    return allLocalTools.filter((tool) => !keepSet.has(tool));
  }
}

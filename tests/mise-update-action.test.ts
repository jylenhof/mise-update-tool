import * as core from '@actions/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolSelector } from '../src/input/tool-selector.js';
import { MiseUpdateAction } from '../src/mise-update-action.js';
import { UpgradeStrategyFactory } from '../src/strategy/upgrade-strategy-factory.js';
import { nodeSnapshot } from './helpers/fixtures.js';
import { baseInputs, createMockRunner } from './helpers/mocks.js';

describe('MiseUpdateAction', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sets outputs when no tools are selected', async () => {
    const inputReader = { read: vi.fn().mockReturnValue(baseInputs) };
    const toolSelector = {
      resolveUpgradeTools: vi.fn().mockReturnValue([]),
    };
    const strategyFactory = { create: vi.fn() };
    const runner = createMockRunner({
      'ls --local --json': JSON.stringify(nodeSnapshot),
    });
    const action = new MiseUpdateAction(
      inputReader as never,
      toolSelector as never,
      strategyFactory as never,
      runner as never,
    );

    await action.run();

    expect(core.setOutput).toHaveBeenCalledWith('changes-made', false);
    expect(core.setOutput).toHaveBeenCalledWith('updated-tools', '');
    expect(core.setOutput).toHaveBeenCalledWith('pull-request-urls', '');
    expect(strategyFactory.create).not.toHaveBeenCalled();
  });

  it('runs the selected upgrade strategy and sets outputs', async () => {
    const inputReader = { read: vi.fn().mockReturnValue(baseInputs) };
    const toolSelector = {
      resolveUpgradeTools: vi.fn().mockReturnValue(['node']),
    };
    const strategy = {
      execute: vi.fn().mockResolvedValue({
        changesMade: true,
        pullRequestUrls: ['https://example.com/pr/1'],
      }),
    };
    const strategyFactory = {
      create: vi.fn().mockReturnValue(strategy),
    };
    const runner = createMockRunner({
      'ls --local --json': JSON.stringify(nodeSnapshot),
    });
    const action = new MiseUpdateAction(
      inputReader as never,
      toolSelector as never,
      strategyFactory as never,
      runner as never,
    );

    await action.run();

    expect(strategyFactory.create).toHaveBeenCalledWith('single', '/repo', 'token');
    expect(core.setOutput).toHaveBeenCalledWith('changes-made', true);
    expect(core.setOutput).toHaveBeenCalledWith('updated-tools', 'node');
    expect(core.setOutput).toHaveBeenCalledWith('pull-request-urls', 'https://example.com/pr/1');
  });

  it('creates a default action instance', () => {
    expect(MiseUpdateAction.createDefault()).toBeInstanceOf(MiseUpdateAction);
  });

  it('rejects tools not listed by mise ls --local --json', async () => {
    const inputReader = {
      read: vi.fn().mockReturnValue({ ...baseInputs, tools: ['terraform'] }),
    };
    const runner = createMockRunner({
      'ls --local --json': JSON.stringify(nodeSnapshot),
    });
    const action = new MiseUpdateAction(
      inputReader as never,
      new ToolSelector(),
      new UpgradeStrategyFactory(runner as never),
      runner as never,
    );

    await expect(action.run()).rejects.toThrow(/Unknown local mise tools: terraform/);
  });
});

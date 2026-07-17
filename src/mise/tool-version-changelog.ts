import {
  MAX_RELEASE_NOTE_BODY_LENGTH,
  MAX_RELEASES_PER_TOOL,
  sanitizeGithubMentions,
  truncateText,
} from '../github/pull-request-body-limits.js';
import type { MiseLsLocalJson } from './mise-upgrader.js';

export interface ReleaseNoteEntry {
  tag: string;
  body: string;
}

export interface ToolVersionChange {
  name: string;
  previousRequested: string;
  nextRequested: string;
  previousVersion: string;
  nextVersion: string;
  githubRepo?: string;
  releaseNotes?: ReleaseNoteEntry[];
}

export class ToolVersionChangelog {
  static diff(
    before: MiseLsLocalJson,
    after: MiseLsLocalJson,
    tools: string[],
  ): ToolVersionChange[] {
    return tools.flatMap((tool) => {
      const previous = before[tool]?.[0];
      const next = after[tool]?.[0];
      if (!previous || !next) {
        return [];
      }

      if (
        previous.version === next.version &&
        previous.requested_version === next.requested_version
      ) {
        return [];
      }

      return [
        {
          name: tool,
          previousRequested: previous.requested_version,
          nextRequested: next.requested_version,
          previousVersion: previous.version,
          nextVersion: next.version,
        },
      ];
    });
  }

  static formatCollapsible(changes: ToolVersionChange[]): string {
    if (changes.length === 0) {
      return '';
    }

    const summary =
      changes.length === 1
        ? `Version changelog (${changes[0].name})`
        : `Version changelog (${changes.length} tools)`;

    const rows = changes.map(
      (change) =>
        `| \`${change.name}\` | ` +
        `\`${change.previousRequested}\` → \`${change.nextRequested}\` | ` +
        `\`${change.previousVersion}\` → \`${change.nextVersion}\` |`,
    );

    return [
      '<details>',
      `<summary>${summary}</summary>`,
      '',
      '| Tool | Requested | Installed |',
      '|------|-----------|-----------|',
      ...rows,
      '',
      '</details>',
    ].join('\n');
  }

  static formatReleaseNotesCollapsible(changes: ToolVersionChange[]): string {
    const withNotes = changes.filter((change) => (change.releaseNotes?.length ?? 0) > 0);
    if (withNotes.length === 0) {
      return '';
    }

    const toolSections = withNotes.map((change) => {
      const allReleaseNotes = change.releaseNotes ?? [];
      const releaseNotes = allReleaseNotes.slice(-MAX_RELEASES_PER_TOOL);
      const omittedReleaseCount = allReleaseNotes.length - releaseNotes.length;

      const notes = releaseNotes
        .map((release) => {
          const body = truncateText(
            sanitizeGithubMentions(release.body || '_No release notes provided._'),
            MAX_RELEASE_NOTE_BODY_LENGTH,
          );
          return `### ${release.tag}\n\n${body}`;
        })
        .join('\n\n');

      const repositorySuffix = change.githubRepo ? ` (${change.githubRepo})` : '';
      const omittedReleaseNotice =
        omittedReleaseCount > 0
          ? `_Omitted ${omittedReleaseCount} older release${omittedReleaseCount === 1 ? '' : 's'}._`
          : '';

      return [
        '<details>',
        `<summary>${change.name}: ` +
          `\`${change.previousVersion}\` → \`${change.nextVersion}\`${repositorySuffix}</summary>`,
        '',
        notes,
        ...(omittedReleaseNotice ? ['', omittedReleaseNotice] : []),
        '',
        '</details>',
      ].join('\n');
    });

    return [
      '<details>',
      `<summary>Release notes (${withNotes.length} tools)</summary>`,
      '',
      ...toolSections,
      '',
      '</details>',
    ].join('\n');
  }
}

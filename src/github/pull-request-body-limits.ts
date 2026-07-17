export const GITHUB_PULL_REQUEST_BODY_MAX_LENGTH = 65_536;
export const MAX_RELEASE_NOTE_BODY_LENGTH = 2_000;
export const MAX_RELEASES_PER_TOOL = 10;

const PULL_REQUEST_BODY_TRUNCATION_NOTICE =
  "\n\n---\n\n_Pull request body truncated because it exceeded GitHub's 65536 character limit._";

/** Zero-width space breaks GitHub @mention notifications while keeping text readable. */
const MENTION_BREAK = '\u200B';

// Matches @user and @org/team, but not emails like user@example.com.
const GITHUB_USER = '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?';
const GITHUB_TEAM = '[a-zA-Z0-9](?:[a-zA-Z0-9_-]{0,38}[a-zA-Z0-9])?';

/**
 * Neutralize GitHub @user / @org/team mentions so they are not notified when
 * release notes are pasted into a pull request body or comment.
 * Leaves email addresses (e.g. user@example.com) unchanged.
 */
export function sanitizeGithubMentions(text: string): string {
  const pattern = new RegExp(`(^|[^a-zA-Z0-9._-])@(${GITHUB_USER}(?:\\/${GITHUB_TEAM})?)`, 'gm');
  return text.replace(pattern, `$1@${MENTION_BREAK}$2`);
}

export function truncateText(text: string, maxLength: number, notice = '… (truncated)'): string {
  if (text.length <= maxLength) {
    return text;
  }

  const budget = Math.max(0, maxLength - notice.length);
  return `${text.slice(0, budget).trimEnd()}${notice}`;
}

export function truncatePullRequestBody(
  body: string,
  maxLength = GITHUB_PULL_REQUEST_BODY_MAX_LENGTH,
): string {
  if (body.length <= maxLength) {
    return body;
  }

  const budget = Math.max(0, maxLength - PULL_REQUEST_BODY_TRUNCATION_NOTICE.length);
  return `${body.slice(0, budget).trimEnd()}${PULL_REQUEST_BODY_TRUNCATION_NOTICE}`;
}

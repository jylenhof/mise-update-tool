export const GITHUB_PULL_REQUEST_BODY_MAX_LENGTH = 65_536;
export const MAX_RELEASE_NOTE_BODY_LENGTH = 2_000;
export const MAX_RELEASES_PER_TOOL = 10;

const PULL_REQUEST_BODY_TRUNCATION_NOTICE =
  "\n\n---\n\n_Pull request body truncated because it exceeded GitHub's 65536 character limit._";

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

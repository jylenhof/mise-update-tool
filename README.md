# mise-update-tool

GitHub Action that upgrades tools from your local mise config with `mise upgrade --bump --local` and optionally opens pull requests when config files change.

## How it works

1. Lists local tools with `mise ls --local --json`
2. Resolves the upgrade set from `tools` and `keep` inputs (both are validated against the local tool list)
3. Runs `mise upgrade --bump --local` for the selected tools
4. Opens one or more pull requests when mise config files change

## Requirements

- A repository with a local mise config (for example `.mise.toml` or `mise.toml`)
- [`mise`](https://mise.jdx.dev/) available in the workflow (use [`jdx/mise-action`](https://github.com/jdx/mise-action))
- A GitHub App installed on the repository with `CLIENT_ID` and `APP_PRIVATE_KEY` secrets
- `contents: write`, `pull-requests: write`, and `workflows: write` granted to the generated app token when you need follow-up workflows to run

`GITHUB_TOKEN` cannot trigger other workflows when it pushes commits or opens pull requests. Use a GitHub App token instead, following the same pattern as [`.github/workflows/release-please.yaml`](.github/workflows/release-please.yaml).

## Example workflow

```yaml
name: mise tool updates

on:
  workflow_dispatch:
    inputs:
      tools:
        description: Comma separated tools to upgrade. Leave empty to upgrade all local tools.
        required: false
        default: ''
      keep:
        description: Comma separated tools to exclude from the upgrade.
        required: false
        default: ''

permissions:
  contents: read

jobs:
  upgrade:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          persist-credentials: false

      - name: Generate GitHub token
        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
        id: generate-token
        with:
          client-id: ${{ secrets.CLIENT_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
          permission-contents: write
          permission-pull-requests: write
          permission-workflows: write
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Install mise
        uses: jdx/mise-action@e6a8b3978addb5a52f2b4cd9d91eafa7f0ab959d # v4.2.0

      - name: Upgrade local mise tools
        uses: jylenhof/mise-update-tool@5b784b74bb3eca2a31a710fc37e07406258a115b # v1.0.0
        with:
          token: ${{ steps.generate-token.outputs.token }}
          tools: ${{ inputs.tools }}
          keep: ${{ inputs.keep }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `token` | yes | — | GitHub token used to push commits and create pull requests |
| `tools` | no | `''` | Comma or newline separated tools to upgrade. Upgrades all local tools when empty |
| `keep` | no | `''` | Comma or newline separated tools to exclude from the upgrade |
| `working-directory` | no | `${{ github.workspace }}` | Directory containing the mise local config |
| `create-pull-request` | no | `true` | Create a pull request when modified files are detected |
| `branch-prefix` | no | `chore/mise-tool-updates` | Prefix for pull request branch names |
| `pull-request-strategy` | no | `single` | `single` for one PR with all tools, or `per-tool` for one PR per tool |
| `pull-request-title` | no | `''` | Optional title override. Supports `{tool}`, `{tools}`, `{previousVersion}`, `{nextVersion}`, `{previousRequested}`, `{nextRequested}` |
| `commit-author-name` | no | — | Git commit author name for PR commits |
| `commit-author-email` | no | — | Git commit author email for PR commits |

`commit-author-name` and `commit-author-email` must both be set when overriding the commit author.

## Outputs

| Output | Description |
|--------|-------------|
| `changes-made` | Whether any files were modified by the upgrade |
| `updated-tools` | Comma-separated list of tools selected for upgrade |
| `pull-request-urls` | Newline-separated URLs of created pull requests |

## Usage examples

Upgrade all local tools except `node`:

```yaml
- uses: jylenhof/mise-update-tool@v1
  with:
    token: ${{ steps.generate-token.outputs.token }}
    keep: node
```

Upgrade only `python` and `uv`:

```yaml
- uses: jylenhof/mise-update-tool@v1
  with:
    token: ${{ steps.generate-token.outputs.token }}
    tools: python, uv
```

Open one pull request per upgraded tool:

```yaml
- uses: jylenhof/mise-update-tool@v1
  with:
    token: ${{ steps.generate-token.outputs.token }}
    pull-request-strategy: per-tool
```

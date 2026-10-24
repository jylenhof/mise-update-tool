# AGENTS.md

Guidance for AI coding agents working in this repository.

## Tooling is managed by mise

This repository uses [mise](https://mise.jdx.dev/) to pin and provide every
development tool (Node.js, `aube`, linters, formatters, etc.). The versions
are declared in [`.mise.toml`](.mise.toml).

Tools are usually **not** installed globally. If a command such as `node`,
`aube`, `vite`, `biome`, `shellcheck` or `yamllint` is not found, run it
through mise instead of installing it yourself:

```sh
mise install            # install all tools pinned in .mise.toml
mise exec -- <command>  # run a command with the mise-managed tools on PATH
mise x -- <command>     # short form
```

Do not change tool versions outside of `.mise.toml`.

## Common tasks

Prefer the mise tasks defined in `.mise.toml`:

```sh
mise run build       # build the action into dist/ (aube exec vite build)
mise run test        # run unit tests with coverage (vitest)
mise run test-watch  # run tests in watch mode
mise run lint        # lint and format-check with Biome
mise run format      # format sources with Biome
mise tasks           # list all available tasks
```

## Notes

- Package manager is `aube` (run as `aube exec <bin>` through mise).
- `dist/` is the built action output; rebuild with `mise run build` after
  changing `src/`.
- Pre-commit hooks run through `prek` (`mise exec -- prek run --all-files`).

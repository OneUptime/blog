# Validation Summary: How to Automate Version Bumping with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, expressions, `workflow_dispatch`, `pull_request` triggers)
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/setup-python@v5`
- semantic-release and its plugin ecosystem (`@semantic-release/commit-analyzer`, `release-notes-generator`, `changelog`, `npm`, `github`, `git`)
- Conventional Commits specification
- commitlint and `@commitlint/config-conventional` (with `wagoid/commitlint-github-action@v5`)
- `npm version` (including prerelease forms)
- `bump2version` (Python)
- `conventional-changelog-cli`
- `jq` for monorepo `package.json` updates
- Semantic Versioning (SemVer)

## Sources Consulted
- semantic-release docs: https://semantic-release.gitbook.io/semantic-release/
- semantic-release plugin docs: https://github.com/semantic-release/semantic-release/blob/master/docs/usage/plugins.md
- Conventional Commits spec: https://www.conventionalcommits.org/en/v1.0.0/
- commitlint docs: https://commitlint.js.org/
- `wagoid/commitlint-github-action`: https://github.com/wagoid/commitlint-github-action
- npm `version` CLI docs: https://docs.npmjs.com/cli/v10/commands/npm-version
- GitHub Actions expressions / `join()`: https://docs.github.com/en/actions/learn-github-actions/expressions
- GitHub Actions `workflow_dispatch` inputs: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch
- `actions/checkout`: https://github.com/actions/checkout
- `actions/setup-node`: https://github.com/actions/setup-node
- `actions/setup-python`: https://github.com/actions/setup-python
- bump2version (and successor `bump-my-version`): https://github.com/c4urself/bump2version
- conventional-changelog-cli: https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-cli
- standard-version (archived): https://github.com/conventional-changelog/standard-version

## Issues Found

1. **Python "Determine bump type" grep patterns were broken.** The original code ran `git log --oneline HEAD~5..HEAD` (which prefixes every line with the commit hash) and then anchored grep patterns with `^feat:`, which can never match because the line starts with the hash. The `BREAKING CHANGE` pattern was also unreliable because `--oneline` only shows the subject, not the commit body/footer where `BREAKING CHANGE:` is conventionally placed. Replaced `--oneline` with `--format=%B` (full commit messages) and switched to `grep -qE` with anchored patterns, so the regex actually matches the conventional commit types as intended.

2. **Changelog Generation section referenced a non-existent GitHub Action.** The snippet used `uses: conventional-changelog/standard-version@v9`, but `standard-version` is an npm CLI tool that lives in that repo — it has no `action.yml` and cannot be used with `uses:` (the repo is also archived). The section also did `git commit --amend --no-edit && git push --force-with-lease` even though no prior commit step existed in the snippet, making the example broken on its own. Replaced the block with a coherent, self-contained example that checks out the repo with a PAT, sets up Node, runs `npx conventional-changelog-cli -p angular -i CHANGELOG.md -s -r 0` directly, and creates a normal commit (guarded by `git diff --staged --quiet`) instead of an amend + force-push.

## Review Notes
- `wagoid/commitlint-github-action@v5` is still functional, but a newer major (`v6`) is available. v5 was left as-is since it is not incorrect.
- `bump2version` is in maintenance mode; its successor `bump-my-version` is now the recommended tool. The example still works for current users so it was left intact.
- The "Manual Version Bumping" workflow correctly relies on `npm version` outputting a `v`-prefixed string (e.g. `v1.0.1`) for the tag.
- The "Multi-Package Version Sync" workflow filters on `paths: ['package.json']` so it will not retrigger from the commit it makes against `packages/*/package.json` — that is intentional and correct.
- The `actions/checkout` snippet for semantic-release correctly sets `fetch-depth: 0` and `persist-credentials: false`, which matches semantic-release's official CI recommendation.
- The `release.config.js` plugin order matches the semantic-release-recommended pipeline ordering.

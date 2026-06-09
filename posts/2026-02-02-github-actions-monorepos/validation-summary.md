# Validation Summary: How to Configure GitHub Actions for Monorepos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, path filters, matrix strategy, reusable workflows, composite actions, service containers, environments)
- Node.js (versions 18 and 20)
- npm workspaces
- pnpm (v8) and `pnpm/action-setup`
- Turborepo (remote caching, `--filter`, `--dry-run=json`)
- dorny/paths-filter action (v3)
- actions/checkout@v4, actions/setup-node@v4, actions/cache@v4, actions/upload-artifact@v4
- PostgreSQL 15 and Redis 7 as service containers
- YAML workflow syntax

## Sources Consulted
- GitHub Actions documentation – Workflow syntax (`on.push.paths`, `on.pull_request.paths`): https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions documentation – Reusable workflows (`workflow_call`): https://docs.github.com/en/actions/using-workflows/reusing-workflows
- GitHub Actions documentation – Composite actions (`runs.using: composite`): https://docs.github.com/en/actions/creating-actions/creating-a-composite-action
- GitHub Actions documentation – Service containers and health-check options: https://docs.github.com/en/actions/using-containerized-services/about-service-containers
- GitHub Actions documentation – Environments and protection rules: https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
- actions/setup-node README – cache input behavior (caches global package manager cache, not node_modules): https://github.com/actions/setup-node
- actions/cache README – usage with `hashFiles` and `restore-keys`: https://github.com/actions/cache
- actions/upload-artifact v4 README: https://github.com/actions/upload-artifact
- dorny/paths-filter v3 README – filters syntax and outputs: https://github.com/dorny/paths-filter
- pnpm/action-setup README (v3): https://github.com/pnpm/action-setup
- pnpm CLI – `pnpm store path` and `--frozen-lockfile`: https://pnpm.io/cli/store, https://pnpm.io/cli/install
- npm CLI – `--workspace` flag (npm 7+): https://docs.npmjs.com/cli/v10/using-npm/workspaces
- Turborepo documentation – Remote Caching env vars (`TURBO_TOKEN`, `TURBO_TEAM`, `TURBO_REMOTE_ONLY`): https://turbo.build/repo/docs/core-concepts/remote-caching
- Turborepo documentation – `--filter` syntax with git ref selector and `--dry-run=json`: https://turbo.build/repo/docs/reference/command-line-reference/run

## Issues Found
- README.md (npm Workspace Caching section): The inline YAML comment read "Automatically caches node_modules based on lock file" for the `cache: 'npm'` input on `actions/setup-node@v4`. This is inaccurate — setup-node caches the package manager's global cache directory (e.g. `~/.npm` for npm) keyed by the hash of the lockfile, not `node_modules`. Updated the comment to "Caches the npm global cache (~/.npm) keyed by package-lock.json hash" to match the documented behavior of actions/setup-node.

## Review Notes
- All third-party action versions used (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/cache@v4`, `dorny/paths-filter@v3`, `pnpm/action-setup@v3`) are current and supported. `pnpm/action-setup@v4` also exists; v3 remains valid.
- The `path-filter` style `if: ${{ needs.changes.outputs.web == 'true' }}` is correct — dorny/paths-filter outputs string values, so the string comparison is required.
- The Turborepo `--filter='...[<sha>]'` syntax correctly selects packages changed since the given commit (and their dependents); pairing this with `fetch-depth: 0` on checkout (as the post does in the `determine-scope` job) is the right approach.
- The `actions/cache@v4` example for Turborepo uses `key: ${{ runner.os }}-turbo-${{ github.sha }}` — this creates a unique cache key per commit; restore-keys then falls back to any previous `*-turbo-*` cache. This is the documented pattern but means every commit writes a new cache entry; teams with strict cache quotas may want to tune this.
- `TURBO_REMOTE_ONLY: true` forces Turbo to only use the remote cache and skip local writes — this is intentional in CI environments but worth being aware of.
- The composite action's `cache: ${{ inputs.package-manager }}` works because actions/setup-node accepts `npm`, `yarn`, or `pnpm` as valid values; the conditional `pnpm/action-setup` step before it ensures pnpm is on PATH when needed.
- No version-specific information appears outdated as of the validation date (2026-06-09).

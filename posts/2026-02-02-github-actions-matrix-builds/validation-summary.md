# Validation Summary: How to Use Matrix Builds in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflow syntax, matrix strategy)
- YAML workflow configuration
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `pnpm/action-setup` (added during review)
- `codecov/codecov-action@v4`
- Node.js (versions 18, 20, 22, 23)
- npm and pnpm package managers
- PostgreSQL (service containers, versions 14, 15, 16)
- `act` (local GitHub Actions runner)

## Sources Consulted
- GitHub Actions documentation — Using a matrix for your jobs: https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs
- GitHub Actions documentation — Workflow syntax (`strategy`, `fail-fast`, `max-parallel`, `include`, `exclude`): https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions
- GitHub Actions documentation — Expressions (`fromJSON`): https://docs.github.com/en/actions/learn-github-actions/expressions
- GitHub Actions documentation — Workflow commands (`$GITHUB_OUTPUT`): https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Actions documentation — Service containers: https://docs.github.com/en/actions/using-containerized-services/about-service-containers
- `actions/setup-node` README (caching prerequisites for pnpm): https://github.com/actions/setup-node
- `actions/checkout` repository (current major version v4): https://github.com/actions/checkout
- `pnpm/action-setup` repository: https://github.com/pnpm/action-setup
- `codecov/codecov-action` repository: https://github.com/codecov/codecov-action

## Issues Found
1. **Real-World Example: pnpm caching ordering bug.** In the "Real-World Example: Testing a Library" section, the workflow used `cache: ${{ matrix.package-manager }}` on `actions/setup-node@v4` while installing pnpm AFTER the setup-node step. Per the `actions/setup-node` documentation, pnpm must be pre-installed before `setup-node` runs, because `setup-node` invokes pnpm to locate its store directory when computing the cache path. The workflow would fail for the pnpm matrix combinations.
   - **Fix applied:** Moved the conditional pnpm installation to BEFORE the `actions/setup-node@v4` step, and switched from `npm install -g pnpm` to the official `pnpm/action-setup@v3` action with `version: 8` (the recommended setup pattern in the GitHub docs and pnpm docs).

## Review Notes
- All other matrix syntax in the post (basic, multi-dimensional, `exclude`, `include`, `fail-fast`, `max-parallel`, dynamic matrix via `fromJSON`, services) is consistent with current GitHub Actions documentation.
- The `fail-fast` default of `true` is correctly described.
- The `$GITHUB_OUTPUT` mechanism for the dynamic matrix example is the current (non-deprecated) approach, replacing the older `::set-output` workflow command.
- The exclude/include math (9 → 6 jobs in the exclude example) is correct.
- `npm test --workspace=...` requires npm 7+ and a workspaces-configured package.json; the post does not state this prerequisite but the syntax itself is valid.
- `codecov/codecov-action@v4` is functional; codecov has since released v5, but v4 remains valid. Not changed since it is not incorrect.
- The included `act` reference for local testing is accurate (nektos/act is a real, widely used tool).
- Node.js 23 is referenced as "experimental" in the include example — Node 23 was released in October 2024 and is a current-but-non-LTS line; treating it as experimental in a CI matrix is a reasonable convention rather than a technical claim, so left as-is.

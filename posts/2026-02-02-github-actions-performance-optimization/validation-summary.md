# Validation Summary: How to Optimize GitHub Actions Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, jobs, steps, matrix, triggers, schedules)
- actions/checkout@v4
- actions/cache@v4 (including cache/save and cache/restore sub-actions)
- actions/setup-node@v4
- actions/setup-python@v5
- actions/setup-go@v5
- actions/upload-artifact@v4 and actions/download-artifact@v4
- docker/setup-buildx-action@v3
- docker/build-push-action@v5
- dorny/paths-filter@v3
- fkirc/skip-duplicate-actions@v5
- Reusable workflows (`workflow_call`)
- Composite actions (`using: composite`)
- Self-hosted runners
- Sparse and shallow Git checkout
- GitHub CLI (`gh api`) and `jq`
- npm workspaces

## Sources Consulted
- GitHub Actions workflow syntax docs: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- actions/checkout README: https://github.com/actions/checkout
- actions/cache README: https://github.com/actions/cache
- actions/setup-node README: https://github.com/actions/setup-node
- actions/setup-python README: https://github.com/actions/setup-python
- actions/setup-go README: https://github.com/actions/setup-go
- actions/upload-artifact README: https://github.com/actions/upload-artifact
- docker/setup-buildx-action: https://github.com/docker/setup-buildx-action
- docker/build-push-action: https://github.com/docker/build-push-action
- dorny/paths-filter README: https://github.com/dorny/paths-filter
- fkirc/skip-duplicate-actions: https://github.com/fkirc/skip-duplicate-actions
- GitHub Actions composite action docs: https://docs.github.com/en/actions/creating-actions/creating-a-composite-action
- GitHub Actions schedule docs (minimum cron interval): https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule

## Issues Found
- **Combining `paths` and `paths-ignore` for the same event** (Path-Based Triggers section): The original example used both `paths` and `paths-ignore` filters on the same `on.push` event. GitHub Actions documentation states these should not be combined for the same event in a workflow; additionally, the `paths-ignore` block was logically redundant because the `paths` filter already restricted triggering to the `api/**`, `tests/api/**`, and workflow file paths (so docs/markdown files outside those paths would never have matched anyway). Fix: removed the `paths-ignore` block and added a short clarifying comment noting that the two filters should not be combined for the same event.

## Review Notes
- `fetch-depth: 1` shown in the "Shallow Clone" section is technically the default value for `actions/checkout@v4`. The YAML is correct and produces a shallow clone, but readers should be aware that they only need to think about this setting if some other workflow is overriding it (e.g., setting `fetch-depth: 0` for full history). The advice to avoid full-history fetches when not needed is still valid.
- `cache: true` shown with `actions/setup-go@v5` is the default for that action; specifying it explicitly is fine for clarity but is not itself a performance change.
- The "Parallel Job Structure" example uploads `node_modules` as an artifact to share between jobs. In practice this can be slower than each job running `npm ci` with `actions/setup-node` caching, because uploading/downloading the very large `node_modules` directory has significant overhead. The example is technically valid GitHub Actions; readers should benchmark before choosing this pattern.
- In the "Dynamic Matrix Generation" example, `npm test --workspace=${{ matrix.package }}` assumes the workspace identifier matches the dorny/paths-filter filter name (e.g., `api`). In real monorepos the workspace identifier is often the package name from `package.json` or a path like `packages/api`. The example is illustrative; readers should adjust to match their workspace setup.
- The `gh api repos/.../actions/runs` query in "Workflow Run Analysis" uses default pagination, which typically returns 30 items, not the 50 implied by the `[:50]` slice. The query still works correctly with fewer items but adding `--paginate` or `-F per_page=50` would more accurately match the comment "Query GitHub API for recent workflow runs".
- All action versions referenced (`actions/checkout@v4`, `actions/cache@v4`, `actions/setup-node@v4`, `actions/setup-python@v5`, `actions/setup-go@v5`, `actions/upload-artifact@v4`, `docker/setup-buildx-action@v3`, `docker/build-push-action@v5`, `dorny/paths-filter@v3`, `fkirc/skip-duplicate-actions@v5`) were current major versions at the time of writing.

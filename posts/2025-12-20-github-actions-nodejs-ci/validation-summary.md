# Validation Summary: How to Set Up Node.js CI Pipeline with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, jobs, matrix strategy, service containers, branch protection)
- Node.js (versions 18, 20, 22)
- npm (npm ci, npm audit, npm outdated, workspaces)
- Jest (coverage reporters, JSON output)
- Playwright (E2E browser testing)
- TypeScript (tsc --noEmit)
- PostgreSQL and Redis service containers
- Reusable/community actions: actions/checkout, actions/setup-node, actions/cache, actions/upload-artifact, actions/github-script, dorny/paths-filter

## Sources Consulted
- actions/setup-node README — https://github.com/actions/setup-node (node-version input, `cache: 'npm'`)
- actions/checkout — https://github.com/actions/checkout (v4)
- actions/cache — https://github.com/actions/cache (v4, cache-hit output)
- actions/upload-artifact — https://github.com/actions/upload-artifact (v4)
- actions/github-script — https://github.com/actions/github-script (v7, github.rest.* Octokit REST API)
- dorny/paths-filter — https://github.com/dorny/paths-filter (v3, `changes` output)
- GitHub Actions docs: service containers — https://docs.github.com/en/actions/using-containerized-services
- GitHub Actions docs: matrix strategy — https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs
- GitHub Actions docs: assigning permissions to jobs — https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs (pull-requests: write for PR comments)
- npm CLI docs: npm ci, npm audit, npm outdated, workspaces — https://docs.npmjs.com/cli
- Jest CLI docs — https://jestjs.io/docs/cli (`--coverage`, `--coverageReporters`, `--json`, `--outputFile`)
- Playwright CI docs — https://playwright.dev/docs/ci (`npx playwright install --with-deps`)

## Issues Found
No technical issues found.

All workflow YAML is syntactically valid and uses current, non-deprecated action versions (checkout@v4, setup-node@v4, cache@v4, upload-artifact@v4, github-script@v7, paths-filter@v3). CLI commands and flags verified:
- `npm ci`, `npm audit --audit-level=high|moderate`, `npm outdated || true`, `npm test --workspace=<name>` are correct.
- Jest coverage flow is accurate: `--coverageReporters=json-summary` emits `coverage/coverage-summary.json`, and `.total.lines.pct` is the correct JSON path for line coverage percentage.
- Service container health-check options for Postgres (`pg_isready`) and Redis (`redis-cli ping`) are correctly formatted, including quoting within the folded scalar.
- The PR-comment job correctly grants `pull-requests: write`, which is sufficient for `github.rest.issues.createComment` on a pull request.
- `fromJson(needs.changes.outputs.packages)` with the `!= '[]'` guard is the correct pattern for dynamic matrices from dorny/paths-filter's `changes` output.

## Review Notes
- Node.js 18 reached end-of-life in April 2025. Testing against it in the matrix is still valid (and common for libraries supporting older runtimes), but readers maintaining new projects may prefer to drop 18 in favor of newer LTS lines. Not an error.
- In the monorepo examples, the first snippet uses scoped workspace names (`@myorg/api`) while the change-detection snippet uses the paths-filter keys (`api`, `web`, `shared`) directly as `--workspace` values. These are two independent illustrations; in a real project the matrix value passed to `--workspace` must match an actual workspace name or path defined in the root `package.json`. Worth keeping in mind but not a technical error in the examples as written.
- The `node_modules` caching example (keyed on `package-lock.json`) intentionally omits `cache: 'npm'` on setup-node to avoid double-caching, which is the correct approach when caching `node_modules` directly.

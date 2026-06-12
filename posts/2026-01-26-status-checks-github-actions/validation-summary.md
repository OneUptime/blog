# Validation Summary: How to Configure Status Checks in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflows
- GitHub status checks and required status checks
- Branch protection and rulesets
- GitHub REST API commit statuses
- GitHub Checks API check runs
- Matrix jobs and conditional jobs
- Node.js CI workflows with npm
- Third-party GitHub Actions: `dorny/paths-filter` and `actions/github-script`

## Sources Consulted
- GitHub Docs: About status checks - https://docs.github.com/articles/about-status-checks
- GitHub Docs: About protected branches - https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub Docs: Managing a branch protection rule - https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- GitHub Docs: Troubleshooting required status checks - https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Docs: REST API endpoints for commit statuses - https://docs.github.com/rest/commits/statuses
- GitHub Docs: REST API endpoints for check runs - https://docs.github.com/rest/checks/runs
- GitHub Docs: Use GITHUB_TOKEN for authentication in workflows - https://docs.github.com/actions/reference/authentication-in-a-workflow
- GitHub Blog: Deprecation of Node 20 on GitHub Actions runners - https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- GitHub `actions/checkout` releases - https://github.com/actions/checkout/releases
- GitHub Marketplace: `actions/setup-node` - https://github.com/marketplace/actions/setup-node-js-environment
- GitHub `actions/github-script` documentation - https://github.com/actions/github-script
- GitHub `dorny/paths-filter` documentation - https://github.com/dorny/paths-filter

## Issues Found
- The examples used `actions/checkout@v4`, `actions/setup-node@v4`, and `actions/github-script@v7`. These are older Node 20-based action majors, while Node 20 is past EOL and GitHub has announced the Node 24 migration path. Updated examples to `actions/checkout@v6`, `actions/setup-node@v6`, and `actions/github-script@v8`.
- The Node.js examples used Node 20 in the named job and Node 18/20 in the matrix. Node 20 is EOL and Node 18 is already EOL, so the examples now use Node 24 for the single-version example and Node 22/24 in the matrix.
- The path-filter example used `dorny/paths-filter@v2`. Updated it to the current `dorny/paths-filter@v3`.
- The Status API examples created commit statuses without explicitly granting `statuses: write` to `GITHUB_TOKEN`. Added job-level `permissions` blocks, including `contents: read` where checkout is also used.
- The Checks API example created a check run without explicitly granting `checks: write` to `GITHUB_TOKEN`. Added a job-level `permissions` block with `checks: write` and `contents: read`.
- The bypass section implied that a workflow itself bypasses required status checks. Updated the section to clarify that bypassing depends on branch protection or ruleset settings, and reframed the YAML as a manual emergency deployment workflow protected by environment approvals.

## Review Notes
The status check, matrix, `needs`, `if: always()`, commit status, and check run concepts match GitHub's documentation. The API examples are illustrative and assume the workflow runs in a context where `GITHUB_TOKEN` is allowed to write statuses or checks; forked pull request workflows and stricter organization settings may still require additional configuration.

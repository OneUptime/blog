# Validation Summary: How to Use Job Dependencies in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflow syntax
- GitHub Actions job dependencies with `needs`
- GitHub Actions matrix strategies
- GitHub Actions expressions and status check functions
- GitHub Actions job outputs and contexts
- GitHub Actions artifacts with `upload-artifact` and `download-artifact`
- GitHub Actions reusable workflows
- PostgreSQL service containers
- Mermaid diagrams

## Sources Consulted
- GitHub Docs: Workflow syntax for GitHub Actions - `jobs.<job_id>.needs`, matrix strategies, service containers, reusable workflow jobs, and secrets inheritance: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Evaluate expressions in workflows and actions - `toJSON`, `contains`, object filters, and status check functions: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Docs: Contexts reference - `needs` context and `needs.<job_id>.result` values: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Docs: Reuse workflows: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Actions `download-artifact` README - `pattern` and `merge-multiple` inputs: https://github.com/actions/download-artifact/blob/main/README.md
- Docker Official Image documentation for PostgreSQL - required `POSTGRES_PASSWORD`: https://hub.docker.com/_/postgres

## Issues Found
- The fan-out example wrote pretty-printed JSON to `$GITHUB_OUTPUT` with a single-line output assignment. Changed the `jq` invocation to compact JSON with `-c` so the job output is valid.
- The fan-out test runner assumed every matrix group had tests. Changed the `jq` lookup to use `[]?` so empty groups do not make `jq` fail.
- The summary example used `toJson`; GitHub's documented function name is `toJSON`. Updated the expression to `toJSON`.
- The conditional notification jobs depended on one staging or production deploy job that would normally be skipped, which would cause downstream jobs to skip unless the conditional explicitly handled dependency results. Updated the conditions to inspect `needs.*.result` while including a status check function.
- The `deploy-if-any-pass` example used `contains(needs.*.result, 'success')` without a status check function, so GitHub would apply the default `success()` check and skip it when another dependency failed. Added `!cancelled()` to make the example behave as described while avoiding unnecessary execution on canceled workflows.
- The PostgreSQL service container used `postgres:16` without `POSTGRES_PASSWORD`, which the official image requires. Added `POSTGRES_PASSWORD: postgres`.

## Review Notes
The snippets are illustrative and assume matching project scripts such as `npm test`, `npm run build`, and deployment scripts exist in the consuming repository. `actions/download-artifact@v4` remains valid for GitHub.com workflows, but the current upstream README now documents newer major versions and notes separate GHES support constraints.

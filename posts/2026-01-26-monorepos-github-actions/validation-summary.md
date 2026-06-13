# Validation Summary: How to Handle Monorepos with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflow syntax
- GitHub Actions reusable workflows
- GitHub Actions cache and artifact actions
- dorny/paths-filter
- pnpm workspaces and filtering
- Turborepo
- Nx and Nx Cloud

## Sources Consulted
- GitHub Actions workflow syntax: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions reusable workflows: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- actions/checkout documentation: https://github.com/actions/checkout
- actions/setup-node documentation: https://github.com/actions/setup-node
- actions/cache Marketplace documentation: https://github.com/marketplace/actions/cache
- actions/upload-artifact Marketplace documentation: https://github.com/marketplace/actions/upload-a-build-artifact
- pnpm GitHub Actions CI documentation: https://pnpm.io/continuous-integration
- pnpm filtering documentation: https://pnpm.io/filtering
- pnpm/action-setup documentation and releases: https://github.com/pnpm/action-setup
- dorny/paths-filter Marketplace documentation: https://github.com/marketplace/actions/paths-changes-filter
- Turborepo GitHub Actions guide: https://turborepo.dev/docs/guides/ci-vendors/github-actions
- Turborepo configuration reference: https://turborepo.dev/docs/reference/configuration
- Turborepo run command reference: https://turborepo.dev/docs/reference/run
- Nx affected documentation: https://nx.dev/docs/features/ci-features/affected
- Nx graph documentation: https://nx.dev/docs/features/explore-graph
- Nx Cloud CLI documentation: https://nx.dev/docs/reference/nx-cloud-cli

## Issues Found
- The path-filter examples referenced `libs/shared/**`, but the sample repository structure places `shared` under `packages/shared`. Updated those filters so shared package changes trigger the API workflow.
- Several snippets used outdated GitHub Action major versions. Updated checkout/setup-node/pnpm setup/cache/upload-artifact examples to current major versions documented for 2026-era workflows.
- `dorny/paths-filter@v2` was outdated. Updated it to `dorny/paths-filter@v4`, matching the current Marketplace documentation.
- Dynamic build jobs called `pnpm` without installing pnpm or configuring Node in those jobs. Added `pnpm/action-setup`, `actions/setup-node`, and `pnpm install --frozen-lockfile` steps to make each job runnable.
- The Turborepo config used the older `pipeline` key and old schema URL. Updated it to the current `tasks` key and `https://turborepo.dev/schema.json`.
- The Turborepo affected commands used manual git filters with a shallow checkout. Updated the checkout depth and commands to use the documented `--affected` flag.
- The Nx graph example exported `dependency-graph.html`, but current Nx documentation shows `nx graph --file=output.json` for file export. Updated the example to generate and upload `dependency-graph.json`.

## Review Notes
- The Nx affected examples use `origin/main` as a simple base reference. Nx recommends using the latest successful main-branch commit as the base in production CI so failed main builds do not hide affected projects in later runs.

# Validation Summary: Scope Monorepo Cache Keys to Avoid Full Rebuilds on Lockfile Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Monorepo task caching
- Nx and `@nx/js`
- Turborepo
- npm lockfiles and installation caches
- CI/CD affected-project selection

## Sources Consulted

- [Nx: Run Only Tasks Affected by a PR](https://nx.dev/docs/features/ci-features/affected)
- [Nx: Inputs and Named Inputs](https://nx.dev/docs/reference/inputs)
- [Nx: How Caching Works](https://nx.dev/docs/concepts/how-caching-works)
- [Turborepo: Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Turborepo: `turbo run` command reference](https://turborepo.com/docs/reference/run)
- [Turborepo caching documentation source](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/crafting-your-repository/caching.mdx)
- [Turborepo deferred-hashing configuration documentation source](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/reference/configuration.mdx#deferred-hashing)

## Issues Found

No technical issues found. The original deferred-hashing caveat is correct; its citation now points directly to the configuration documentation explaining that behavior.

## Review Notes

- The Nx `projectsAffectedByDependencyUpdates` configuration is current. Its default value is `"all"`, and `"auto"` compares parsed base and head lockfiles to map changed resolved packages to affected workspace projects.
- Nx affected-project selection and task-cache input configuration are correctly described as separate concerns.
- The Nx `externalDependencies` behavior and the warning about custom command targets are consistent with the current input reference.
- The Turborepo global-hash and package-hash descriptions, `globalDependencies`, `globalEnv`, per-task `env`, package configuration, and `turbo run build --dry=json` command are current.
- Tasks using deferred hashing through `jit` or `dependencyOutputs` can report `hash: null` and a `hashReason` during a dry run because their final keys depend on execution. Actual run summaries are appropriate for those cases.
- No product versions are pinned, so behavior should be rechecked after significant Nx, Turborepo, or package-manager upgrades.

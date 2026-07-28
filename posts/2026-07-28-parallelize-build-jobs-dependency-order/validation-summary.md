# Validation Summary: How to Parallelize Build Jobs Without Violating Dependency Order

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- CI/CD dependency graphs and parallel build scheduling
- GitHub Actions jobs, matrices, artifacts, status expressions, and job dependencies
- GitLab CI/CD stages and `needs` DAG scheduling
- Monorepo task graphs in Nx, Bazel, Pants, and Turborepo
- Build artifacts, caches, job outputs, registries, and shared-resource concurrency

## Sources Consulted
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions expression syntax and status check functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)
- [GitHub Actions contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)
- [Running variations of jobs in a GitHub Actions workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations)
- [Store and share data with GitHub Actions workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [`actions/checkout` official repository and releases](https://github.com/actions/checkout)
- [`actions/upload-artifact` official repository and releases](https://github.com/actions/upload-artifact/releases)
- [`actions/download-artifact` official repository and releases](https://github.com/actions/download-artifact/releases)
- [GitLab `needs` documentation](https://docs.gitlab.com/ci/yaml/needs/)
- [GitLab CI/CD pipelines](https://docs.gitlab.com/ci/pipelines/)
- [Nx run tasks documentation](https://nx.dev/docs/features/run-tasks)
- [Bazel dependency concepts](https://bazel.build/concepts/dependencies)
- [Pants targets and BUILD files](https://www.pantsbuild.org/stable/docs/using-pants/key-concepts/targets-and-build-files)
- [Turborepo task configuration](https://turborepo.com/docs/crafting-your-repository/configuring-tasks)

## Issues Found
- The GitHub Actions example used superseded artifact-action major versions. Updated `actions/upload-artifact@v6` to the current `@v7` major and `actions/download-artifact@v7` to the current `@v8` major, matching the official action repositories as of the validation date. Their documented `name` and `path` inputs remain valid, so no other changes to the example were required.

## Review Notes
- The GitHub Actions DAG, matrix, `needs` context, `strategy.max-parallel`, artifact-transfer, and `!cancelled()` fan-in guidance are consistent with the official documentation.
- The GitLab description of stage barriers, DAG scheduling with `needs`, and immediate scheduling with `needs: []` is accurate.
- The project-graph and task-graph distinction is consistent with the official Nx, Bazel, Pants, and Turborepo documentation.
- The artifact action majors used in the example require a sufficiently recent self-hosted Actions Runner and are not supported on GitHub Enterprise Server in the same way as on GitHub.com; users targeting GHES should select the versions documented for their GHES release.

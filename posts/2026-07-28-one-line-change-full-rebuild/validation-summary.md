# Validation Summary: Why Did a One-Line Change Trigger a Full Rebuild? Fixing Dependency Graphs

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Git
- Continuous integration affected-selection workflows
- Monorepo dependency and task graphs
- Build caching and remote caching
- Nx and Nx Cloud
- Turborepo
- Bazel
- Pants

## Sources Consulted

- [Git `diff` documentation](https://git-scm.com/docs/git-diff)
- [Git `rev-parse` documentation](https://git-scm.com/docs/git-rev-parse)
- [Nx affected tasks](https://nx.dev/docs/features/ci-features/affected)
- [Nx task cache inputs](https://nx.dev/docs/guides/tasks--caching/configure-inputs)
- [Nx inputs and named inputs reference](https://nx.dev/docs/reference/inputs)
- [Nx workspace and task graphs](https://nx.dev/docs/features/explore-graph)
- [Nx cache-miss troubleshooting](https://nx.dev/docs/kb/troubleshoot-cache-misses)
- [Turborepo caching and troubleshooting](https://turborepo.com/docs/crafting-your-repository/caching)
- [Turborepo `run` reference](https://turborepo.com/docs/reference/run)
- [Turborepo configuration reference](https://turborepo.com/docs/reference/configuration)
- [Turborepo `query` reference](https://turborepo.com/docs/reference/query)
- [Bazel query how-to](https://docs.bazel.build/versions/main/query-how-to.html)
- [Bazel query language reference](https://bazel.build/query/language)
- [Bazel remote-cache debugging](https://bazel.build/remote/cache-remote)
- [Remote Execution API `Action` definition](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto)
- [Pants `dependents` reference](https://www.pantsbuild.org/stable/reference/goals/dependents)
- [Pants advanced target selection](https://www.pantsbuild.org/stable/docs/using-pants/advanced-target-selection)

## Issues Found

- The reverse-dependency list mentioned Bazel `allrdeps` without its required query mode. Changed it to specify that `allrdeps` is available in Sky Query.
- The global-input examples could imply that every listed item is automatically global in every build tool. Clarified that broad invalidation depends on the tool and its configuration.
- The cache-miss guidance grouped differing platform properties with storage-layer problems despite first assuming identical fingerprints. Clarified that differing platform properties mean the action keys or fingerprints are different; only a miss with identical fingerprints should be investigated as cache availability, policy, eviction, authentication, or namespace behavior.

## Review Notes

- The Git commands are syntactically valid. The three-dot `git diff` form compares the merge base of `BASE` and `HEAD` with `HEAD`, which is appropriate for inspecting a pull-request-style change set.
- Turborepo currently supports `--dry=json` and `--summarize`; its dry-run JSON includes task hashes, commands, inputs, outputs, dependencies, and dependents.
- Nx currently distinguishes dependency inputs such as `"^production"` from task ordering through `dependsOn`, such as `"^build"`, as described.
- Nx Cloud's cache troubleshooting view can compare saved hash inputs between similar task runs.
- Turborepo's affected-query documentation confirms that an insufficiently deep checkout can conservatively mark all packages as changed.
- The existing documentation links resolve successfully, although some redirect to newer canonical paths or domains.
- No specific tool versions are claimed in the post. This review reflects the official documentation available on 2026-07-28.

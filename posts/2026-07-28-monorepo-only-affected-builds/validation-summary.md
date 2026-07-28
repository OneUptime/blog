# Validation Summary: Run Only Affected Monorepo Builds Without Missing Shared-Library Changes

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Monorepo affected-task selection
- Git change detection and merge-base comparisons
- Nx affected commands, project graphs, task inputs, and caching
- Turborepo affected selection, package and task graphs, task inputs, and remote caching
- Pants changed-target selection and dependency introspection
- Bazel reverse-dependency queries
- CI build automation and remote caching

## Sources Consulted

- [Nx: Run Only Tasks Affected by a PR](https://nx.dev/docs/features/ci-features/affected)
- [Nx: Configure Inputs for Task Caching](https://nx.dev/docs/guides/tasks--caching/configure-inputs)
- [Nx: Inputs and Named Inputs](https://nx.dev/docs/reference/inputs)
- [Nx: CLI command reference](https://nx.dev/docs/reference/nx-commands)
- [Turborepo: Constructing CI](https://turborepo.com/docs/crafting-your-repository/constructing-ci)
- [Turborepo: Running tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Turborepo: `turbo run` reference](https://turborepo.com/docs/reference/run)
- [Turborepo: `turbo query` reference](https://turborepo.com/docs/reference/query)
- [Turborepo: `turbo.json` configuration reference](https://turborepo.com/docs/reference/configuration)
- [Pants: Advanced target selection](https://www.pantsbuild.org/stable/docs/using-pants/advanced-target-selection)
- [Pants: Project introspection](https://www.pantsbuild.org/stable/docs/using-pants/project-introspection)
- [Bazel: Query quickstart](https://bazel.build/query/quickstart)
- [Bazel: Query how-to](https://docs.bazel.build/versions/main/query-how-to.html)
- [Git: `git diff` documentation](https://git-scm.com/docs/git-diff)
- [Git: `git merge-base` documentation](https://git-scm.com/docs/git-merge-base)

## Issues Found

- The original definition implied that affected selection universally filters requested tasks by their declared inputs. That is not true for all covered tools and modes. Nx `affected` first selects affected projects and then runs each requested target on that project subset; task inputs control hashing and cache reuse. Turborepo's `--affected` is package-level by default, while task-input-aware selection is available through `futureFlags.affectedUsingTaskInputs` or task-filtered `turbo query affected`. The affected-definition bullet and task-granularity explanation were updated to state these distinctions.

## Review Notes

- The Nx, Turborepo, and Pants commands in the post are current and valid.
- All six links in the post's Official Documentation section resolve successfully. The Nx task-input link currently redirects to its canonical knowledge-base URL, and the Turborepo links redirect from `turborepo.com` to `turborepo.dev`; both redirect paths are valid.
- Turborepo documents `futureFlags.affectedUsingTaskInputs` as an experimental future behavior rather than the default. The post now names the flag explicitly so readers do not assume default `--affected` selection is task-granular.
- The post does not pin tool versions. This review used the current Nx v23 documentation, Turborepo documentation, Pants 2.32 stable documentation, and current Bazel and Git documentation available on 2026-07-28.

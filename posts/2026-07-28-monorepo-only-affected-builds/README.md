# How to Run Only Affected Builds in a Monorepo Without Missing Shared-Library Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monorepo, Build Automation, Nx, Turborepo, Build System

Description: Compute affected monorepo tasks from a correct Git baseline and transitive dependency graph while treating global and undeclared inputs conservatively.

---

An affected build is correct only when two calculations are correct:

1. which inputs changed between a trusted base and the candidate;
2. which projects and tasks can observe those changed inputs.

Directory path filters solve only the first half. If `apps/store` imports `packages/ui`, a change under `packages/ui` must select the store even though no file under the app changed.

## Define "Affected"

For each changed input, include:

- the project that owns it;
- every transitive dependent project;
- the tasks in those projects whose declared inputs include the change;
- any global tasks invalidated by repository-wide configuration.

The direction matters. If `app -> ui -> tokens`, then changing `tokens` affects `tokens`, `ui`, and `app`. Changing `app` does not require rebuilding `tokens`.

Task granularity matters too. A documentation edit in `ui` may affect its docs task but not its production build if task inputs are modeled separately.

## Choose the Correct Git Baseline

The changed-file set normally compares a base commit with the candidate head. In pull requests, use the target branch relationship or merge base intended by the tool. On the default branch, comparing only `HEAD^` is unsafe when the previous successful CI run is older than one commit; skipped or failed commits can fall through the gap.

Record:

- base SHA;
- head SHA;
- event type;
- whether the checkout contains the necessary history;
- the resulting changed-file list.

Nx `affected` accepts `base` and `head` values and uses Git history plus the project graph. Turborepo's `--affected` uses a base/head comparison and documents that insufficient checkout history causes all packages to be treated as changed—a safe fallback. Pants provides `--changed-since` and `--changed-dependents=transitive`.

Fetch enough Git history. A shallow clone that lacks the base can produce an error, an empty diff, or a conservative full run depending on the tool and wrapper. A full run is slower; an empty run is dangerous.

## Build a Trustworthy Project Graph

Use the source of truth your ecosystem already understands:

- workspace/package manifests;
- Bazel `BUILD` targets;
- Pants targets and dependency inference;
- Nx project graph and plugin inference;
- Turborepo package graph and task definitions;
- language project references.

Inspect the graph rather than assuming inference found everything. Nx can visualize affected projects with `nx graph --affected`. Pants can list dependencies and transitive dependents. Bazel `rdeps` identifies reverse dependencies within a universe. Turborepo queries and filters expose packages selected because a dependency changed.

Runtime-only dependencies are common blind spots:

- dynamic imports assembled from strings;
- plugins discovered from a directory;
- templates, migrations, or static assets read at runtime;
- generated code whose generator input belongs elsewhere;
- integration tests that call another service;
- shared schemas consumed outside the language import graph.

Declare those edges explicitly. An affected algorithm cannot infer a relationship the build model does not contain.

## Classify Global Inputs

Some changes affect nearly everything:

- root lockfiles;
- compiler or runtime version files;
- base build images;
- root task configuration;
- shared lint, TypeScript, test, or bundler config;
- code generators and organization-wide schemas;
- CI scripts that change task behavior.

Mark these as named global inputs rather than maintaining an opaque list of paths in CI. Nx task inputs can include files, runtime values, and environment variables. Turborepo has global dependencies and environment inputs that participate in task fingerprints.

Be conservative first. Nx's guidance for task inputs explicitly recommends starting safe with more inputs and narrowing only when there is evidence. A false positive costs compute; a false negative can merge a broken dependent.

Not every lockfile edit must rebuild every project if the tool can map changed dependency entries to consumers. But do not implement a naïve text diff unless package-manager semantics are fully understood. Pants documents conservative behavior around target generators and lockfile changes.

## Separate Selection from Caching

Affected selection asks which tasks could have changed relative to a baseline. Caching asks whether a selected task with an exact input fingerprint has already run.

Use both:

```bash
nx affected -t lint,test,build --base="$BASE" --head="$HEAD"
```

or:

```bash
turbo run lint test build --affected
```

The affected set may still be large after a shared library change. A remote cache can reuse tasks whose full input hash is unchanged across repeated CI attempts. Do not make affected selection dangerously narrow just to achieve speed.

## Handle Deleted, Renamed, and Unowned Files

A robust selector needs policies for:

- deleted project configuration;
- files moved between project roots;
- a project removed while dependents still reference it;
- root files that no project owns;
- generated files absent from the checkout;
- changes to the graph-building configuration itself.

Use "run all" as the fallback for an unknown or unowned behavior-changing file. Maintain a reviewed ignore list only for files proven not to affect tasks, such as editorial documentation. Avoid silently ignoring every file outside `apps/` and `packages/`.

## Add a Correctness Backstop

Run a full build periodically and compare it with affected results:

1. On selected mainline or scheduled commits, run affected tasks normally.
2. In an audit lane, run the complete task set with remote cache reads disabled where practical.
3. Compare failures and output hashes or manifests.
4. If full work finds something affected work missed, add the missing edge or input before restoring trust.

Also create graph contract tests:

- changing a shared library selects known consumers;
- changing root config selects every relevant task;
- changing one leaf does not select unrelated leaves;
- deleting a project triggers dependent validation;
- missing Git history falls back safely.

For critical repositories, sample full runs on pull requests as well. The percentage is an engineering risk decision.

## Diagnose an Unexpected Set

When too much runs, ask:

- Did the baseline jump too far back?
- Did a root lockfile or global input change?
- Is a high-fan-out "utilities" project too broad?
- Did the tool fail to find Git history and choose all projects?
- Is the project boundary too coarse?

When too little runs, ask:

- Is a transitive-dependent option missing?
- Is a runtime or generated dependency undeclared?
- Does the checkout compare the wrong SHAs?
- Is a global configuration absent from task inputs?
- Did a path ignore hide a behavior-changing file?

Print the reason each project is affected. That explanation is more useful than a bare count.

## Roll Out in Audit Mode

Initially, calculate and log the affected set but still run everything. Compare for several weeks across shared-library, lockfile, tooling, deletion, and refactor changes. Then skip unaffected tasks while retaining scheduled full builds and a manual full-run escape hatch.

Affected builds are not fundamentally a path-filter feature. They are a test of the repository's dependency model. Accurate graphs and conservative global inputs make them safe; remote caching makes even their worst cases tolerable.

## Official Documentation

- [Nx affected tasks](https://nx.dev/docs/features/ci-features/affected)
- [Nx task cache inputs](https://nx.dev/docs/guides/tasks--caching/configure-inputs)
- [Turborepo constructing CI](https://turborepo.com/docs/crafting-your-repository/constructing-ci)
- [Turborepo running tasks and source-control filters](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Pants advanced target selection](https://www.pantsbuild.org/stable/docs/using-pants/advanced-target-selection)
- [Bazel query how-to](https://docs.bazel.build/versions/main/query-how-to.html)

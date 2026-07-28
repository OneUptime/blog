# How to Parallelize Build Jobs Without Violating Dependency Order

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Parallel Builds, Build Automation, GitHub Action, GitLab CI

Description: Turn a serial CI pipeline into an explicit dependency graph that runs independent work concurrently and transfers outputs only along declared edges.

---

Parallel CI is safe when the pipeline is a directed acyclic graph: each job declares the work it needs before it can start, and jobs without a dependency may run in any order.

The difficult part is not adding runners. It is finding hidden edges. A serial pipeline often appears correct only because one step accidentally leaves files, services, or state for the next.

## Draw the Graph Before Editing YAML

List every job with:

- its required source and generated inputs;
- the artifacts or scalar values it produces;
- external state it reads or writes;
- whether another job must complete first;
- expected duration and resource demand.

For example:

```text
                 -> unit-linux  \
checkout -> build -> unit-macos  -> release-check -> publish
                 -> integration /
lint --------------------------/
```

`lint` can start immediately. Test jobs require the packaged output from `build`. `release-check` is a fan-in gate that depends on every required validation. `publish` depends on the gate and runs only for a trusted release event.

Do not add an edge merely because jobs were historically adjacent. Add it only for data, ordering, or a controlled side effect. Unnecessary edges lengthen the critical path.

## Express Dependencies, Not Stages Alone

In GitHub Actions, jobs run concurrently by default unless `needs` connects them:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: ./scripts/build
      - uses: actions/upload-artifact@v7
        with:
          name: app-${{ github.sha }}
          path: dist/app.tar.gz

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: ./scripts/lint

  test:
    needs: build
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/download-artifact@v8
        with:
          name: app-${{ github.sha }}
          path: dist
      - run: ./scripts/test-shard '${{ matrix.shard }}' 4

  gate:
    if: ${{ !cancelled() }}
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - name: Require every dependency
        env:
          LINT_RESULT: ${{ needs.lint.result }}
          TEST_RESULT: ${{ needs.test.result }}
        run: |
          test "$LINT_RESULT" = success
          test "$TEST_RESULT" = success
```

GitLab stages impose barriers by default: every job in a stage waits for the previous stage. Its `needs` keyword creates a DAG so a job starts as soon as its listed dependencies finish, even while unrelated earlier-stage jobs continue.

Use `needs: []` in GitLab for a job that truly has no prerequisite and should start immediately.

## Transfer Data Explicitly

Jobs may run on different machines. Never rely on a file written to a runner workspace by another job.

Choose the correct channel:

- artifact for a binary, generated source, report, or other required file;
- job output for small metadata such as a version or digest;
- cache for reconstructible acceleration data;
- registry for a container or package intended for deployment;
- external service for deliberately shared state.

An ordering edge without data transfer does not move files. Conversely, downloading an artifact without `needs` may allow a consumer to start before the producer has uploaded it.

Build once when multiple test jobs need the same candidate. Upload that candidate, then fan out. Rebuilding independently in every shard wastes time and can give each shard different bytes.

## Separate Project Dependencies from Task Dependencies

In a monorepo, `service-a` depending on `library-b` is a project edge. "Test after build" is a task edge. A correct scheduler needs both.

For a project graph:

```text
library-b:build -> service-a:build -> service-a:test
```

Do not assume directory order expresses this. Nx, Bazel, Pants, and Turborepo can calculate task graphs when project dependencies and task inputs are declared. If CI manually creates a matrix, generate it from the same graph or keep the mapping small and reviewed.

## Decide What May Run at the Same Time

Two jobs are independent only if their side effects do not collide. Inspect:

- shared test databases and tenant names;
- fixed TCP ports on self-hosted runners;
- mutable package tags;
- deployment environments;
- shared cache write locations;
- rate-limited external APIs;
- hardware devices or licenses;
- cleanup scripts that delete broad shared paths.

Give each parallel job a unique namespace derived from a run and matrix value. For example, create a database named from `run_id` and shard, then delete only that exact database in cleanup.

Serialize genuinely exclusive work with a concurrency mechanism, lock service, or one dedicated job. Do not serialize the whole pipeline because one resource is exclusive.

## Bound Parallelism

Maximum parallelism is not always minimum duration. Too many jobs can:

- queue behind a fixed runner pool;
- saturate a database or package registry;
- duplicate setup and artifact transfer;
- exhaust memory on a self-hosted host;
- trigger API throttling;
- cost more than the latency saved.

GitHub matrix jobs support `strategy.max-parallel`. Set a measured limit:

```yaml
strategy:
  max-parallel: 4
  matrix:
    shard: [1, 2, 3, 4, 5, 6, 7, 8]
```

Balance shards by historical duration rather than test count. Eight shards where one contains every slow test still have one long critical path. Also include setup and upload time; tiny jobs may be slower when split.

## Design Fan-In Behavior

A downstream job normally runs only when its dependencies succeed. A reporting or gate job may need to inspect all outcomes even if one failed.

On GitHub, use an explicit status condition and inspect the `needs` results. Avoid `always()` on jobs that perform critical operations or could resist cancellation; `!cancelled()` is often a safer base for aggregation. Never let the aggregation job turn failed required checks into a green result.

Separate:

- required validations that must all pass;
- experimental jobs allowed to fail;
- cleanup that should run after failure;
- deployment that must never run after a failed ancestor.

Make one stable required gate useful when matrix members change names, but ensure the gate evaluates each required member.

## Test the Graph, Not Only a Happy Run

Exercise these cases:

1. fail one producer and confirm consumers do not start;
2. fail one parallel test and confirm publishing is blocked;
3. cancel the run and confirm cleanup does not deploy or hang;
4. remove an optional matrix item and confirm fan-in still works;
5. run with caches empty and prove every required file crosses an artifact edge;
6. randomize task order locally where the build tool supports it;
7. run two workflow instances concurrently to expose shared-state collisions.

Measure job start, execution, queue, and transfer times. Optimize the critical path, not the sum of job durations.

## A Safe Refactoring Sequence

First split source-only checks such as formatting and linting; they usually have no build dependency. Next, build one immutable candidate and fan out tests that consume it. Then use the build system's dependency graph to parallelize project tasks. Finally tune shards and runner counts from measurements.

The test of a correct graph is simple: any topological ordering should produce the same result. If changing scheduler timing changes correctness, at least one dependency or shared-resource constraint is still undeclared.

## Official Documentation

- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Running job variations in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations)
- [Store and share workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [GitLab `needs`](https://docs.gitlab.com/ci/yaml/needs/)
- [GitLab CI/CD pipelines](https://docs.gitlab.com/ci/pipelines/)
- [Nx run tasks](https://nx.dev/docs/features/run-tasks)
- [Turborepo configuring tasks](https://turborepo.com/docs/crafting-your-repository/configuring-tasks)

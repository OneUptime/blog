# Why Did `depends_on` Make Every Woodpecker Step Run in Parallel? Building the DAG You Intended

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, DAG, depends_on, Workflow Design

Description: Build an explicit Woodpecker dependency graph after depends_on switches step execution from serial order to DAG scheduling.

---

Woodpecker steps run serially in their YAML order by default. The moment any step in that workflow uses `depends_on`, Woodpecker switches the entire step set to directed-acyclic-graph scheduling. Every step without an explicit dependency becomes a root, and all roots can start immediately. Woodpecker compiles the graph into topological stages: steps in one stage run in parallel, while stages run sequentially. That global mode switch is why adding one dependency can make several previously serial steps run together.

This behavior is deliberate in Woodpecker 3.x. The fix is not to rearrange YAML. Draw the graph you intend, give every non-root step the correct predecessors, and let only genuinely independent roots run in parallel.

## The Serial Default

Without `depends_on`, definition order is execution order:

~~~yaml
steps:
  - name: lint
    image: node:24-alpine
    commands:
      - npm ci
      - npm run lint

  - name: unit-test
    image: node:24-alpine
    commands:
      - npm test

  - name: package
    image: node:24-alpine
    commands:
      - npm run build
~~~

`unit-test` starts after `lint`, and `package` starts after `unit-test`. That sequence is implicit. YAML order is enough only while the workflow remains in serial mode.

## The One-Line Mode Switch

Now add a dependency to `package`:

~~~yaml
steps:
  - name: lint
    image: node:24-alpine
    commands:
      - npm run lint

  - name: unit-test
    image: node:24-alpine
    commands:
      - npm test

  - name: package
    image: node:24-alpine
    commands:
      - npm run build
    depends_on: [unit-test]
~~~

Woodpecker now builds a DAG for all steps:

- `lint` has no predecessor, so it is ready immediately.
- `unit-test` has no predecessor, so it is ready immediately.
- `package` is assigned to the next stage because it depends on `unit-test`.

Woodpecker executes topological stages sequentially, so in this exact graph the `package` stage is not considered until both `lint` and `unit-test` finish. Even so, `lint` is not a graph predecessor of `package`: that extra wait comes from the stage barrier, not from YAML source order. If the graph later changes, a check that depends on `lint` can occupy the same stage as `package` and run alongside it. Encode intended prerequisites instead of relying on incidental stage boundaries.

An explicit empty list, `depends_on: []`, also marks a step as a root and enables parallel execution. Use it to document intentional parallelism, not as decoration.

## Draw the Desired Graph

For a pipeline with lint and unit tests in parallel, then packaging, integration tests, and deployment in sequence, the intended edges are:

~~~text
lint ───────┐
            ├── package ── integration ── deploy
unit-test ──┘
~~~

Encode every edge:

~~~yaml
steps:
  - name: lint
    image: node:24-alpine
    commands:
      - npm ci
      - npm run lint
    depends_on: []

  - name: unit-test
    image: node:24-alpine
    commands:
      - npm ci
      - npm test
    depends_on: []

  - name: package
    image: node:24-alpine
    commands:
      - npm ci
      - npm run build
    depends_on: [lint, unit-test]

  - name: integration
    image: node:24-alpine
    commands:
      - npm run integration
    depends_on: [package]

  - name: deploy
    image: alpine:3.22
    commands:
      - ./scripts/deploy.sh
    depends_on: [integration]
~~~

The roots are explicit, the join names both prerequisites, and every later stage has an edge. A reviewer can understand this without relying on file order.

## Dependencies Express Readiness, Not Just Order

Before adding an edge, state the invariant it protects:

- `package` needs generated files from `lint`? Usually it does not; perhaps only policy requires lint to pass.
- `integration` needs the package output and a successful package step.
- `deploy` must not start before all release checks pass.
- A notification may need to wait for several branches of the graph.

An unnecessary dependency can push a step into a later stage and remove useful parallelism, including for unrelated work behind that stage barrier. A missing dependency can put two steps in the same stage and create a race; a stage barrier may also mask a missing logical edge. Treat the graph as build logic, not formatting.

Steps in one workflow share the same workspace. Parallel roots can therefore write to the same files at the same time. Even if their logical checks are independent, commands such as two simultaneous `npm ci` operations in the repository root can race over `node_modules`. Give parallel steps separate directories, make setup a shared predecessor, or use tools that safely share their output.

## A Shared Preparation Step

If multiple checks need the same generated state:

~~~yaml
steps:
  - name: prepare
    image: node:24-alpine
    commands:
      - npm ci
      - npm run generate
    depends_on: []

  - name: lint
    image: node:24-alpine
    commands:
      - npm run lint
    depends_on: [prepare]

  - name: unit-test
    image: node:24-alpine
    commands:
      - npm test
    depends_on: [prepare]

  - name: package
    image: node:24-alpine
    commands:
      - npm run build
    depends_on: [lint, unit-test]
~~~

`prepare` completes once, then lint and tests fan out. Because the workspace persists between steps of the workflow, they see its generated files. Make the parallel consumers read-only with respect to shared state where possible.

## Conditional Steps Need Optional Dependencies

Suppose a security scan runs only when dependency files change:

~~~yaml
  - name: dependency-scan
    image: example.com/security/scanner:2
    commands:
      - scan .
    when:
      - event: [push, pull_request]
        path:
          include: [package.json, package-lock.json]
~~~

A packaging step that always names it as a required dependency can be excluded or unable to proceed when the scan is not part of the workflow. Woodpecker 3.15 and later support optional dependency objects:

~~~yaml
  - name: package
    image: node:24-alpine
    commands:
      - npm run build
    depends_on:
      - name: dependency-scan
        optional: true
      - unit-test
~~~

When `dependency-scan` exists, `package` waits for it. When its `when` condition filters it out, Woodpecker drops that optional edge. Keep dependencies required when absence should make the downstream step impossible.

## Failure and Status Still Matter

By default, downstream work requires successful progress. A notification or cleanup step often needs to run after either outcome:

~~~yaml
  - name: notify
    image: example.com/ops/notifier:1
    depends_on: [lint, unit-test]
    when:
      - status: [success, failure]
~~~

The `status` filter controls whether the step may run under success or failure. `depends_on` supplies the graph edges used to place the step in a later stage; the stage barrier means every step in earlier stages reaches a terminal point first. Use both when a finalizer must wait for parallel branches and then run even if one failed.

Do not use `failure: ignore` merely to make a graph continue. That setting changes the workflow result semantics. Use it only when a failed check is genuinely advisory.

## Step DAG Versus Workflow DAG

Woodpecker uses `depends_on` in two scopes:

- Under a step, it names other steps in the same workflow.
- At the top level of a workflow file, it names other workflows, derived from their filenames.

Example `.woodpecker/deploy.yaml`:

~~~yaml
depends_on:
  - lint
  - test
  - build

steps:
  - name: deploy
    image: alpine:3.22
    commands:
      - ./deploy.sh
~~~

Here `lint`, `test`, and `build` refer to workflow filenames, not step names in `deploy.yaml`. Workflows execute on separate agents and do not share workspace files. Workflow dependencies sequence status; they do not transport build output. Use an artifact-storage plugin or publish an immutable package/image when a later workflow needs data.

## Migrating Old Group Syntax

Woodpecker 3.0 removed step grouping through `steps.[name].group` and directs users to `depends_on`. A group from 2.x is not automatically equivalent to a correctly designed graph. Reconstruct the intended fan-out and joins explicitly:

1. list true roots;
2. list every step's prerequisites;
3. identify conditional predecessors;
4. identify joins that must wait for all branches;
5. identify failure-path finalizers.

Scope any documentation using `group` to Woodpecker 2.x. Do not mix it into a 3.x workflow.

## Validate the Graph

Run the Woodpecker linter and a local execution before pushing:

~~~bash
woodpecker-cli lint .woodpecker.yaml
woodpecker-cli exec --backend-engine docker .woodpecker.yaml
~~~

Check for:

- misspelled step names;
- duplicate names;
- cycles;
- dependencies on conditionally absent steps;
- roots that write to the same workspace paths;
- joins missing one predecessor;
- deploy steps that can bypass a check.

Then inspect a real pipeline timeline. Steps in each stage should overlap, and the next stage should start only after every step in the current stage finishes. Confirm that joins appear in the expected stages and name every required predecessor.

## A Conversion Checklist

When the first `depends_on` is added:

1. Assume source order no longer controls execution, then map the topological stages Woodpecker will create.
2. Mark intentional roots with `depends_on: []`.
3. Add an explicit predecessor to every non-root.
4. Give join steps all required incoming edges.
5. Make filtered dependencies optional only when omission is safe.
6. Prevent parallel writes to shared workspace paths.
7. Add status conditions for failure-path steps.
8. Lint and execute with a CLI compatible with the server.

That review is necessary even if only one step originally needed parallelism.

## Official Documentation

- [Woodpecker: Step depends_on behavior](https://woodpecker-ci.org/docs/usage/workflow-syntax#depends_on)
- [Woodpecker: Workflow flow control](https://woodpecker-ci.org/docs/usage/workflows#flow-control)
- [Woodpecker: Optional dependencies](https://woodpecker-ci.org/docs/usage/workflows#optional-dependencies)
- [Woodpecker: Local pipeline execution](https://woodpecker-ci.org/docs/usage/local-execution)
- [Woodpecker: Linter](https://woodpecker-ci.org/docs/usage/linter)
- [Woodpecker: 3.0 migration notes](https://woodpecker-ci.org/migrations#300)

## Conclusion

Adding `depends_on` changes the entire workflow from serial ordering to explicit DAG scheduling. All steps without dependencies become immediately runnable, regardless of YAML position, and dependent steps are grouped into later topological stages that run sequentially. Preserve only real parallelism: declare roots, encode every required edge and join, handle conditional predecessors explicitly, and verify that parallel steps do not race over the shared workspace.

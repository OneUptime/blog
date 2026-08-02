# Argo Workflows DAG vs. Steps Templates: Which Structure Fits Your Pipeline?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, DAG, Steps, Workflow Design, CI/CD, Data Pipeline

Description: Choose between Argo Workflows DAG and steps templates by modeling dependencies, parallel stages, failure behavior, output references, and maintainable pipeline boundaries.

---

Argo Workflows offers two template types for orchestrating other templates:

- A **steps template** is a list of lists. Outer lists run sequentially; entries in one inner list run in parallel.
- A **DAG template** lists tasks and the dependencies that must be satisfied before each task can run. Tasks with no dependencies can start immediately.

Both can call the same container, script, resource, HTTP, suspend, or reusable external templates. The choice is about how to express control flow, not which workloads Argo can execute.

The short rule is: use **steps** when the pipeline is naturally a small number of ordered stages, and use a **DAG** when dependency edges-not stage numbers-are the clearest description of the work.

## How Steps Scheduling Works

The YAML shape is important. `steps` is not a flat list:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: steps-pipeline-
spec:
  entrypoint: pipeline
  templates:
    - name: pipeline
      steps:
        - - name: validate
            template: echo
            arguments:
              parameters:
                - name: message
                  value: validate
        - - name: unit-tests
            template: echo
            arguments:
              parameters:
                - name: message
                  value: unit-tests
          - name: integration-tests
            template: echo
            arguments:
              parameters:
                - name: message
                  value: integration-tests
        - - name: publish
            template: echo
            arguments:
              parameters:
                - name: message
                  value: publish

    - name: echo
      inputs:
        parameters:
          - name: message
      container:
        image: alpine:3.23
        command: [echo]
        args: ["{{inputs.parameters.message}}"]
```

This creates three sequential groups:

1. `validate`
2. `unit-tests` and `integration-tests` in parallel
3. `publish`

The third group is an implicit barrier: it does not start until the preceding group completes successfully according to the workflow's control-flow rules. You do not declare separate edges from both test steps to `publish`; membership in the next outer list expresses that relationship.

### Steps Are a Good Fit When

- people already describe the workflow as “prepare, then test in parallel, then publish”;
- every task in one stage should wait for the entire prior stage;
- the number of parallel branches is small;
- a top-to-bottom file mirrors the operational runbook; or
- nested templates hide most internal complexity.

The tradeoff is over-serialization. If one task in the next stage needs only one result from the prior stage, a steps template still waits at the whole group boundary unless you restructure it.

## How DAG Scheduling Works

A DAG makes every prerequisite explicit:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: dag-pipeline-
spec:
  entrypoint: pipeline
  templates:
    - name: pipeline
      dag:
        tasks:
          - name: validate
            template: echo
            arguments:
              parameters:
                - name: message
                  value: validate

          - name: unit-tests
            dependencies: [validate]
            template: echo
            arguments:
              parameters:
                - name: message
                  value: unit-tests

          - name: integration-tests
            dependencies: [validate]
            template: echo
            arguments:
              parameters:
                - name: message
                  value: integration-tests

          - name: publish
            dependencies: [unit-tests, integration-tests]
            template: echo
            arguments:
              parameters:
                - name: message
                  value: publish

    - name: echo
      inputs:
        parameters:
          - name: message
      container:
        image: alpine:3.23
        command: [echo]
        args: ["{{inputs.parameters.message}}"]
```

`validate` has no dependencies, so it is a root. After it completes, both test tasks become eligible. `publish` becomes eligible only after both test dependencies are satisfied.

A DAG may have multiple roots. It can also express a graph that does not divide cleanly into stages. Suppose documentation needs only the validated source while an image needs both validation and compilation. In a DAG, documentation can start without waiting for compilation merely because both were placed in a conceptual “build stage.”

### DAGs Are a Good Fit When

- the workflow has fan-out and fan-in in several places;
- branches have different prerequisites;
- independent roots should start immediately;
- eliminating unnecessary waiting matters;
- conditional success, failure, skip, or daemon states affect scheduling; or
- the graph is easier to review as edges than as nested list indentation.

The tradeoff is that a large flat task list can become hard to navigate. A DAG is not automatically maintainable just because it exposes maximum parallelism; meaningful task names and nested template boundaries still matter.

## The Most Important Semantic Difference: Barrier vs. Edge

Consider this dependency graph:

```text
fetch-config -> build-docs
fetch-source -> compile -> test
build-docs -----------------> publish
test -----------------------> publish
```

If `fetch-config` and `fetch-source` are one steps group, and `build-docs` and `compile` are the next, both second-group tasks wait for **both** fetches. That may be unnecessary.

A DAG encodes only the required edges:

```yaml
dag:
  tasks:
    - name: fetch-config
      template: fetch-config
    - name: fetch-source
      template: fetch-source
    - name: build-docs
      dependencies: [fetch-config]
      template: build-docs
    - name: compile
      dependencies: [fetch-source]
      template: compile
    - name: test
      dependencies: [compile]
      template: test
    - name: publish
      dependencies: [build-docs, test]
      template: publish
```

This is why the official DAG guide describes DAGs as allowing maximum parallelism. Argo schedules from declared dependencies instead of artificial stage boundaries.

Maximum eligibility does not mean unlimited pods. Workflow-level and template-level `parallelism`, controller limits, namespace limits, Kubernetes scheduling capacity, quotas, mutexes, and semaphores can still constrain execution.

## Conditional Dependencies Favor DAGs

The `dependencies` array expresses simple prerequisites. Enhanced Depends adds `depends`, task-result operands, and boolean operators:

```yaml
- name: notify
  depends: "deploy.Succeeded || deploy.Failed || deploy.Errored"
  template: notify
```

Available result operands documented by Argo include:

- `.Succeeded`
- `.Failed`
- `.Errored`
- `.Skipped`
- `.Omitted`
- `.Daemoned`

Looped tasks can also expose aggregate results such as `.AnySucceeded` and `.AllFailed` for `depends` expressions.

A more selective gate can be written as:

```yaml
- name: release
  depends: "unit-tests.Succeeded && (security-scan.Succeeded || security-scan.Skipped)"
  template: release
```

Use parentheses even when operator precedence seems obvious; dependency expressions are production control flow and should be readable during an incident.

Argo's documentation states that `dependencies` and `depends` cannot be mixed in the same DAG task group. When converting, a simple array:

```yaml
dependencies: [A, B, C]
```

corresponds to:

```yaml
depends: "A && B && C"
```

With enhanced `depends`, represent acceptable failure states in the expression rather than relying on DAG-task `continueOn`.

## Failure Behavior Needs an Explicit Decision

DAG templates fail fast by default. When a task fails, Argo stops scheduling new DAG tasks, waits for already running tasks to complete, and then marks the DAG failed.

For independent branches that should all finish collecting results, set:

```yaml
dag:
  failFast: false
  tasks:
    # ...
```

`failFast: false` lets independent branches continue after another branch fails. It does not turn a failed dependency into a success: tasks whose `depends` expressions are not satisfied can still be omitted.

Steps make sequential stop points visually obvious, but failure policy still deserves review. Both steps and DAG tasks support control fields such as `when`, hooks, and documented forms of `continueOn`; both can also invoke templates configured with retries. Do not choose steps solely because “later work should not run on failure”; both structures can express controlled failure, while DAG `depends` is more precise about which outcomes unlock which tasks.

## Output References Change Prefix

The template that produces an output is identical in either structure, but the caller's reference prefix differs.

In steps:

```yaml
value: "{{steps.generate.outputs.parameters.version}}"
```

In a DAG:

```yaml
value: "{{tasks.generate.outputs.parameters.version}}"
```

Artifacts follow the same rule:

```yaml
from: "{{tasks.build.outputs.artifacts.binary}}"
```

This is a common refactoring bug. Changing `steps:` to `dag:` while leaving `{{steps...}}` references behind produces unresolved inputs even when the dependency graph itself is correct.

Data flow should usually agree with control flow. If `publish` consumes `{{tasks.build.outputs.artifacts.binary}}`, declare a dependency path that ensures `build` reaches an acceptable result before `publish` is evaluated.

## Both Structures Support Loops and Conditions

Do not pick a DAG merely because the workflow fans out over data. Argo's `withItems`, `withParam`, and `withSequence` can expand either steps or DAG tasks. Likewise, both can use `when` conditions.

The design question remains:

- Is the loop one stage in an ordered sequence? Steps may be clearer.
- Do downstream consumers wait for different producers or loop outcomes? A DAG may express the real dependencies better.

Use `parallelism` or synchronization when an expanded loop must not start every pod at once. Structure controls eligibility; limits control admitted concurrency.

## You Can Nest DAG and Steps Templates

Argo's official DAG documentation explicitly notes that templates invoked from either structure can themselves be DAG or steps templates. This is often better than forcing an entire organization to choose one style.

For example:

- a top-level DAG coordinates ingest, training, evaluation, and publication;
- the training task invokes a steps template for setup, parallel trainers, and teardown;
- a release steps template invokes a small DAG of independent regional checks.

Each template then exposes a narrow input/output contract. The top-level graph describes business dependencies without containing every pod-level action.

## Decision Matrix

| Pipeline characteristic | Prefer steps | Prefer DAG |
| --- | --- | --- |
| Straight sequence | Yes | Works, but may be verbose |
| A few parallel tasks followed by a barrier | Yes | Also works |
| Multiple roots | Awkward | Yes |
| Different prerequisites per branch | Often over-serializes | Yes |
| Complex result-based conditions | Limited visual fit | Yes, with `depends` |
| Maximum natural parallelism | Requires careful grouping | Derived from edges |
| Runbook-like readability | Strong | Depends on graph size |
| Large flat definition | Can become deeply indented | Can become a long task list |
| Nested modular components | Yes | Yes |

## Refactor Safely Between Them

When changing a steps template to a DAG:

1. List each step and the data it consumes.
2. Draw the minimum prerequisite edges; do not mechanically connect whole former stages.
3. Change output references from `steps` to `tasks`.
4. Translate failure behavior, including any `continueOn`, into explicit `depends` results where appropriate.
5. Decide whether DAG `failFast` should stay at its default or be `false`.
6. Review concurrency-the new DAG may expose much more parallel work.
7. Run `argo lint` and submit a small test with observable durations and intentional failures.

When changing a DAG to steps, do the reverse analysis. Every outer-list boundary adds a barrier. Confirm that the extra waiting is intentional and that conditional dependency expressions have a safe equivalent.

## Recommendation

Start with the simplest structure that states the truth about the pipeline. If operators say “these stages always happen in this order,” use steps. If they say “this task needs A and C, while that task only needs B,” use a DAG.

Do not optimize for the fewest YAML lines. Optimize for a reviewer being able to answer three questions quickly:

1. What can run now?
2. What exact outcome unlocks the next task?
3. What continues when one branch fails?

Steps answer those questions through ordered groups. DAGs answer them through edges and result expressions.

## Official Documentation

- [Argo Workflows: Steps walkthrough](https://argo-workflows.readthedocs.io/en/latest/walk-through/steps/)
- [Argo Workflows: DAG walkthrough](https://argo-workflows.readthedocs.io/en/latest/walk-through/dag/)
- [Argo Workflows: Core concepts for steps and DAGs](https://argo-workflows.readthedocs.io/en/latest/workflow-concepts/)
- [Argo Workflows: Enhanced Depends logic](https://argo-workflows.readthedocs.io/en/latest/enhanced-depends-logic/)
- [Argo Workflows: Workflow inputs and task output references](https://argo-workflows.readthedocs.io/en/latest/workflow-inputs/)
- [Argo Workflows: Synchronization and parallelism](https://argo-workflows.readthedocs.io/en/latest/synchronization/)
- [Argo Workflows: Field reference](https://argo-workflows.readthedocs.io/en/latest/fields/)

# How to Sequence Drone Pipelines with depends_on and Control Parallelism

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, YAML, DevOps, Troubleshooting

Description: Define pipeline and step dependency graphs in Drone so tests, packaging, and release work follow the intended order even when many runners are available.

The order of YAML documents in `.drone.yml` does not make separate pipelines run sequentially. Drone can distribute independent pipelines across runners and execute them in parallel.

Use top-level `depends_on` to express dependencies between pipelines. Use step-level `depends_on` to order steps inside one pipeline. Those names belong to different scopes. [Drone multi-pipeline configuration](https://docs.drone.io/pipeline/configuration/)

## Express a pipeline chain explicitly

The following configuration is a runnable scheduling demonstration. It intentionally uses marker commands so you can inspect order without triggering a deployment:

```yaml
kind: pipeline
type: docker
name: checks
trigger:
  event: [push]
steps:
  - name: mark-checks
    image: alpine:3
    commands:
      - date -u
      - echo "Checks stage finished"
---
kind: pipeline
type: docker
name: package
depends_on:
  - checks
trigger:
  event: [push]
steps:
  - name: mark-package
    image: alpine:3
    commands:
      - date -u
      - echo "Packaging stage finished"
---
kind: pipeline
type: docker
name: release
depends_on:
  - package
trigger:
  event: [push]
steps:
  - name: mark-release
    image: alpine:3
    commands:
      - date -u
      - echo "Release stage reached"
```

The dependency names refer to `name: checks` and `name: package`, not their individual step names. Each pipeline has a distinct name, and each edge points toward a prerequisite. The graph must not contain a cycle.

The demonstration deliberately uses the same event filter on all three stages. When moving release work to tags or promotions, design that as its own event flow rather than expecting an earlier push's in-memory dependency graph to persist into a later build.

## A dependency is not an artifact transfer

Even when `package` waits for `checks`, it starts with its own workspace. Drone documents that separate pipelines do not share generated files or filesystem state. A dependency establishes order, not a common disk. [Pipeline state isolation](https://docs.drone.io/pipeline/configuration/#multiple-pipelines)

If the release stage needs a packaged artifact, upload it to an artifact store and have release retrieve an immutable identifier, or keep the stages as steps inside one pipeline. Merely using the same workspace path in two pipeline documents does not connect their underlying volumes.

For a simple build that needs shared files and no distinct executor requirements, a single sequential pipeline is often sufficient.

## When parallelizing steps, define the whole graph

Steps run sequentially by default. Once using an explicit dependency graph, Drone's documentation says to configure dependencies for all steps. This makes the intended fan-out and join visible:

```yaml
kind: pipeline
type: docker
name: checks-and-package

steps:
  - name: prepare
    image: alpine:3
    depends_on: []
    commands:
      - mkdir -p output

  - name: unit
    image: alpine:3
    depends_on: [prepare]
    commands:
      - echo unit > output/unit.txt

  - name: integration
    image: alpine:3
    depends_on: [prepare]
    commands:
      - echo integration > output/integration.txt

  - name: package
    image: alpine:3
    depends_on: [unit, integration]
    commands:
      - test -s output/unit.txt
      - test -s output/integration.txt
      - tar -czf output/results.tar.gz output/unit.txt output/integration.txt
```

Here `unit` and `integration` write different files, so their parallel work does not race over a shared output. `package` waits for both. Replace marker steps with project commands only after verifying the graph. [Drone step parallelism](https://docs.drone.io/pipeline/docker/syntax/parallelism/)

## Handle skipped and failed prerequisites deliberately

A filtered step is not the same as a successful test. Drone can correct the step graph when conditional steps are skipped. Therefore, a downstream package step must not assume that every prerequisite produced an output just because its name appears in `depends_on`. Align conditions and assert required artifacts explicitly. [Skipped-step graph behavior](https://docs.drone.io/pipeline/docker/syntax/parallelism/)

Keep required checks as normal failing steps. If a required check uses `failure: ignore`, a later release can proceed despite that check's error. Reserve failure-tolerant behavior for work whose failure really is non-blocking. [Drone step failure handling](https://docs.drone.io/pipeline/docker/syntax/steps/)

## Verify with enough runner capacity to expose mistakes

A single busy runner can make an incorrect graph appear sequential by accident. Run the marker example when at least two execution slots are available and inspect pipeline and step start/end times.

Then deliberately fail a required check and confirm release work does not run. Test an excluded event and a conditionally skipped step as separate cases. Finally, remember that dependencies order work within one build; they do not serialize deployments from two different builds. Use deployment-side coordination when concurrent builds could mutate the same environment.

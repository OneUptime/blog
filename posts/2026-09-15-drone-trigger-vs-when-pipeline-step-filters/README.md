# Drone trigger vs. when: How to Filter Pipelines and Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, YAML, DevOps, Troubleshooting

Description: Use Drone trigger rules to select whole pipelines and when rules to select steps, with explicit branch, event, tag, and failure behavior.

In Drone, `trigger` selects whether a pipeline should run, while a step's `when` selects whether that step should execute within the pipeline. A permissive step condition cannot bring back a pipeline that its trigger excluded.

Start by writing down the intended event policy. For example: run tests on pushes and pull requests, publish only after a successful push to `main`, and report success or failure. Then encode each decision at the appropriate level.

## Put broad eligibility on the pipeline

This example assumes a Node project with a committed lockfile and a test script:

```yaml
kind: pipeline
type: docker
name: application

trigger:
  event:
    - push
    - pull_request

steps:
  - name: test
    image: node:24
    commands:
      - npm ci
      - npm test

  - name: publish
    image: plugins/docker
    settings:
      registry: registry.example.com
      repo: registry.example.com/acme/application
      tags:
        - ${DRONE_COMMIT_SHA}
      username:
        from_secret: registry_writer_user
      password:
        from_secret: registry_writer_token
    when:
      event: [push]
      branch: [main]

  - name: report
    image: alpine:3
    commands:
      - echo "Reached the build reporting step"
    when:
      status: [success, failure]
```

The publishing example requires a Dockerfile, the named secrets, and a runner that supports the Docker plugin's execution requirements. Pin approved image versions or digests when adopting it.

The pipeline admits the two listed event types. The publish step further requires both a push and the `main` branch. Drone's condition categories combine with AND; list entries within the event selection express alternatives. [Drone step conditions](https://docs.drone.io/pipeline/docker/syntax/conditions/)

## Check the result with an event table

For the example above, the intended behavior is:

| Incoming event | Pipeline admitted | Test step | Publish step |
|---|---|---|---|
| Push to `main` | Yes | Runs | Runs if earlier work succeeds |
| Push to `feature/login` | Yes | Runs | Skipped |
| Pull request targeting `main` | Yes | Runs | Skipped |
| Tag `v2.4.0` | No | Does not run | Does not run |
| Scheduled cron event | No | Does not run | Does not run |

This table catches a common mistake: putting `event: [tag]` on a publish step while allowing only push events in the pipeline trigger. The tag never reaches that step.

Place a branch restriction on the pipeline only when every step should be excluded outside that branch. A pipeline-level `branch: [main]` would stop feature-branch push tests in this example.

## Treat branch and tag selection separately

For pull requests, Drone evaluates the **target** branch in a branch condition. That is different from filtering the contributor's source branch. Tags do not have a branch association in Drone's trigger model. [Drone branch and event triggers](https://docs.drone.io/pipeline/docker/syntax/trigger/)

Use a separate tag pipeline when the policy is different:

```yaml
kind: pipeline
type: docker
name: release-tag-check

trigger:
  event: [tag]
  ref:
    - refs/tags/v*

steps:
  - name: check
    image: alpine:3
    commands:
      - echo "Release tag pipeline selected"
```

Do not add `branch: [main]` to infer that the tag was created from `main`. If release policy requires ancestry verification, perform an explicit Git check using the necessary fetched references in a step.

Drone filter patterns are globs, not regular expressions. A value such as `^release/.*$` should not be used as though the matcher were a regex engine. Quote patterns beginning with YAML-special characters, and verify the intended refs with representative events.

## Account for status and dependencies

Ordinary steps are skipped after failure unless their status conditions permit failure execution. The report step requests both success and failure states. It still belongs to the selected pipeline and is not a universal finalizer for cancellation, lost runners, or termination of the entire execution environment. [Drone failure handling](https://docs.drone.io/pipeline/docker/syntax/steps/)

When adding `depends_on` for parallel steps, explicitly describe the dependency graph. Conditions select work; dependencies order work. A publish step needs both the correct event conditions and an ordering path after all required checks.

## Verify policy independently of credentials

First test the event policy with harmless marker commands in a non-deploying repository. Cover every row of the event table and inspect the selected and skipped steps. Then attach publishing credentials to the restricted publish step.

Keep secret access controls as a separate boundary. Drone withholds repository secrets from pull requests by default, and pipeline authors may be able to change YAML. A `when` clause is useful workflow configuration, but it does not replace repository trust and secret policy. [Drone secret policy](https://docs.drone.io/secret/repository/)

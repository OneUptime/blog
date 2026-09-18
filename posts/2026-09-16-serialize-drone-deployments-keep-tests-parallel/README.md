# Serialize Drone Production Deployments While Keeping Test Pipelines Parallel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Deployment, Testing, DevOps

Description: Serialize named Drone production pipelines with concurrency limits while preserving parallel tests and explicit deployment admission.

A repository-wide concurrency setting can protect production by slowing every build, including tests that never touch production. Drone lets you place a limit on the named deployment pipeline while keeping test pipelines available to run concurrently.

That distinction works only when the protected pipeline name represents the actual resource being guarded. Multiple names, repositories, or deployment tools require coordination beyond a single Drone pipeline limit.

## Split build events from deployment events

Use ordinary push and pull-request builds to test and publish eligible artifacts. Promote a verified build when it is ready for a deployment target. Drone's [promotion workflow](https://docs.drone.io/promote/) creates a new execution associated with the selected source build, which is useful for separating testing from deployment authorization.

This illustrative configuration has a test pipeline and one production pipeline:

```yaml
kind: pipeline
type: docker
name: tests

steps:
  - name: unit
    image: node:24
    commands:
      - npm ci
      - npm test

trigger:
  event:
    - push
    - pull_request

---
kind: pipeline
type: docker
name: production

concurrency:
  limit: 1

steps:
  - name: deploy
    image: python:3.13-slim
    commands:
      - python ci/deploy_release.py

trigger:
  event:
    - promote
    - rollback
  target:
    - production
```

The test commands assume a Node project with a lockfile and test script. `ci/deploy_release.py` represents your reviewed release resolver and deployment program; provide its dependencies, credentials, health checks, and source-artifact validation. Drone does not provide that application-specific program.

The important part is the top-level `concurrency.limit` on `production`. It is defined in the [Docker pipeline schema](https://docs.drone.io/yaml/docker/). Keep its name stable across the events that mutate the same environment.

## Understand the scope of the limit

The Drone scheduler's [concurrency implementation](https://github.com/harness/harness/blob/drone/scheduler/queue/queue.go) compares the repository and pipeline name. Check the matching revision for your deployed version. It does not create a universal lock named after `trigger.target`, and it does not make every step called `deploy` mutually exclusive.

For example, two pipelines named `production-blue` and `production-green` are different scopes even when both modify the same cluster. Similarly, identically named pipelines in two repositories do not automatically share a lock.

If several repositories deploy a shared database or environment, use a deployment service, GitOps controller, or a correctly implemented external lock at that shared boundary. All writers must participate. A runner with capacity one is not an equivalent global lock when another runner can accept the same work.

Check repository-wide concurrency settings too. A low repository limit can still constrain tests even after the deployment pipeline has its own limit. Runner capacity, labels, and platform eligibility also affect how much parallelism you actually get.

## Keep the protected operation inside the pipeline

The gate remains useful while the pipeline remains active. If a step launches a deployment remotely, exits immediately, and lets the remote rollout continue, the next Drone pipeline may begin before the first rollout finishes.

Make the deployment program wait for the external operation to reach the required terminal state. Bound the wait, propagate cancellation where supported, and reconcile uncertain outcomes after network failures. A timed-out pipeline does not prove the external deployment stopped.

Decide which operations belong to the critical section. Applying a migration, updating application configuration, changing the image, and verifying the environment may all need to be serialized together. Preparing a release archive or running unit tests usually does not.

Do not hold a production slot while waiting indefinitely for a human decision. Perform approval and release eligibility checks before starting the protected operation, using mechanisms whose authorization cannot be edited by untrusted pipeline code.

## Separate exclusivity from freshness

A limit of one prevents the named pipelines from overlapping under the scheduler's supported behavior. It does not establish that every queued candidate is still the release you want. A delayed old build can be promoted after a newer release, or an operator can select the wrong source build.

Have the deployment program check a trusted release manifest and an environment-specific ordering policy. Make rollbacks explicit so an older artifact can be deployed through an authorized new request. Record the source build separately from the deployment execution number.

Keep rollback and promotion under the same production name if both mutate the same environment and depend on the same gate. Test old commits too: configurations from earlier revisions may have different pipeline names or filters, depending on your configuration source.

## Prove the intended behavior

In a disposable environment, start two production executions with a deliberately bounded slow deployment. Confirm that the second remains pending until the first has finished. At the same time, start an ordinary test build and verify that it runs when eligible runner capacity is available.

Then test cancellation, a failed remote rollout, and a deliberately stale candidate. Check both Drone's state and the deployment target. The gate is effective when production operations remain serialized through completion while unrelated testing continues at the capacity you planned.

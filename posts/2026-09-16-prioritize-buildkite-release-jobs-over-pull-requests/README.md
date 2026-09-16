# How to Prioritize Buildkite Release Jobs Over Pull Request Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Deployment, DevOps, Automation

Description: Set Buildkite job priorities for release work, reserve eligible capacity, and avoid confusing scheduling priority with concurrency or preemption.

---

A release job waiting behind dozens of pull-request tests is often a scheduling-policy problem. Buildkite can dispatch higher-priority jobs first, but priority cannot interrupt a running test, bypass dependencies, or create an agent with the required capabilities.

Use a small priority policy for jobs, then ensure the release has eligible capacity. Measure queue wait separately from execution time so you can tell whether the change actually improves delivery.

## Set priority on release command steps

For self-hosted agents sharing a queue:

```yaml
steps:
  - label: "Release package"
    key: release-package
    command: "./scripts/release-package.sh"
    priority: 20
    agents:
      queue: linux-ci

  - label: "Release verification"
    depends_on: release-package
    command: "./scripts/verify-release.sh"
    priority: 20
    agents:
      queue: linux-ci
```

Ordinary pull-request test steps can retain the default priority of `0`. Higher integers are preferred for dispatch. A top-level `priority` can apply a default to a whole uploaded pipeline, with individual step overrides where necessary.

The [job priority guide](https://buildkite.com/docs/pipelines/configure/workflows/job-priority) documents priority and ordering. Use a few meaningful tiers, such as normal work, releases, and emergency recovery. Hundreds of slightly different values make the queue harder to reason about.

## Prioritize the bootstrap too

A dynamically uploaded release pipeline cannot benefit from its later priorities until its upload job runs. If the initial uploader waits behind all pull-request work, the release is delayed before the important steps even exist.

Set priority on the release pipeline's initial command in Buildkite settings:

```yaml
steps:
  - label: "Upload release pipeline"
    command: "buildkite-agent pipeline upload .buildkite/release.yml"
    priority: 20
    agents:
      queue: linux-ci
```

Then include the intended priority in `.buildkite/release.yml` as well. Treat the bootstrap and uploaded work as separate scheduling decisions.

Only authorized release builds should enter this path. A branch name containing `release` is not an authorization mechanism, especially when fork builds can choose their own branch names or modify pipeline generators.

## Understand the limits

Priority changes the next dispatch decision. It does not preempt a command already running. If every eligible worker is occupied by a 40-minute test, an urgent release still waits until a worker becomes available.

Priority also does not remove a `depends_on` edge or a concurrency-group limit. A release blocked on integration tests must wait for them, and a deployment limited to one production operation must wait for that slot.

Inspect whether the job is waiting for an agent, a dependency, a concurrency group, or hosted capacity before changing priority. These are different bottlenecks even when the user-facing symptom is “the release has not started.”

Buildkite's [hosted-agent overview](https://buildkite.com/docs/agent/buildkite-hosted) describes priority for hosted compute as best-effort under capacity constraints. The deterministic self-hosted queue experiment described here should not be taken as a guarantee of identical hosted start order.

## Reserve capacity when latency matters

For a predictable release-start objective, maintain a small dedicated deployment or release queue. Keep general tests on their existing queue and route only trusted release work to the reserved pool.

A shared queue with priority is more efficient during quiet periods, but cannot protect capacity already occupied by long-running jobs. A dedicated queue costs idle resources but can provide a clearer start-time bound when it remains warm.

The [queue overview](https://buildkite.com/docs/agent/queues) explains how steps target queues and how agents join them. Verify the release pipeline's cluster and queue access, agent tags, and actual connected worker count.

For spillover designs, use deliberate capability tags and sufficient capacity. Do not assume an agent can listen to arbitrary multiple queues within a cluster; a self-hosted agent has one queue assignment.

## Keep production serialization

A fast release queue still needs a deployment lock:

```yaml
steps:
  - label: "Deploy production"
    command: "./scripts/deploy-production.sh"
    priority: 20
    concurrency: 1
    concurrency_group: "application/production"
    agents:
      queue: deployments
```

Priority and serialization are complementary. One chooses which eligible queued work receives compute; the other prevents concurrent operations on the protected environment. Review the [concurrency documentation](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency) before relying on priority to reorder jobs within a concurrency group.

Also prevent stale releases through release identity and promotion policy. A high priority does not prove a build is the newest approved version.

## Measure fairness and latency

In a disposable queue with limited agents, enqueue several harmless ordinary jobs followed by a release-priority job. Confirm the release is selected when an eligible worker finishes, while the already-running job continues.

Track release queue wait, pull-request queue wait, worker utilization, and how often urgent jobs arrive. If release traffic continuously dominates, normal development work can starve. Add capacity or adjust tiers instead of continually increasing release priority values.

The useful outcome is a release that starts promptly under expected load while preserving its dependencies, production lock, and a reasonable service level for ordinary pull-request builds.

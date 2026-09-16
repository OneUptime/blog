# How to Control Which Buildkite Agent Receives a Retried Job

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Troubleshooting, DevOps, Automation

Description: Use Buildkite queue retry affinity and agent tags to direct retries while distinguishing preferences from strict placement constraints.

---

A retry that lands on the same machine can reproduce an infrastructure fault: a damaged dependency cache, an exhausted filesystem, or a broken local service. A retry on a different machine can also lose the warm state needed to investigate an intermittent failure.

Choose which outcome you want before changing agent selection. Buildkite provides a queue-level retry preference, while agent tags impose eligibility constraints. These controls solve different problems.

## Use the queue retry preference

For a self-hosted queue, inspect its retry agent affinity setting. Current Buildkite documentation describes two choices:

- **Prefer Warmest Agent** favors the agent that most recently finished a job.
- **Prefer Different Agent** favors an agent other than the one used by the previous attempt, when another eligible agent is available.

The second choice has a fallback: when another suitable agent is unavailable, the retry can still use the warmest agent. It is not a guarantee of a different host. See [agent prioritization and retry affinity](https://buildkite.com/docs/agent/self-hosted/prioritization) for the documented behavior.

Use the different-agent preference for general test queues where machine-local failures are plausible and builds are designed to run anywhere. Use warm placement when cached state materially improves performance and you have good cache integrity checks.

Make the change in the intended queue's settings, then record the old value and compare retry outcomes over several builds. This is a scheduling preference for a pool, not a property of one test command.

## Check the candidate pool

A job can only move among agents eligible for its constraints:

```yaml
steps:
  - label: "Linux tests"
    key: linux-tests
    command: "./scripts/test.sh"
    agents:
      queue: linux-tests
      architecture: amd64
```

Here `architecture` is a custom tag you must assign to the agents. The queue key must exist, the pipeline must have access to it, and suitable agents must be connected and available.

If only one connected agent matches both values, changing retry affinity cannot create another candidate. Likewise, three agent processes on one physical host can count as different agents while sharing the same disk, kernel, or Docker daemon. Decide whether your actual requirement is another process, another virtual machine, or another failure domain.

The [queue overview](https://buildkite.com/docs/agent/queues) explains queue targeting and the single-queue assignment of a self-hosted agent. Keep queue membership separate from your own hardware and isolation tags.

## Use tags for strict isolation

When investigating a bad machine, a reliable operational action is to stop it from accepting new work and leave healthy capacity in the queue. Follow your agent drain procedure so existing jobs can finish when appropriate.

For a deliberate diagnostic run, target a known pool with a tag:

```yaml
steps:
  - label: "Reproduce on isolated worker"
    command: "./scripts/reproduce.sh"
    agents:
      queue: diagnostics
      diagnostic_pool: clean
```

This is an example policy: provision agents with `diagnostic_pool=clean` and keep that pool isolated from normal jobs. Labels and custom tags do not themselves reset machines. The provisioning process must actually supply the clean environment the tag promises.

An existing retried job keeps its step's targeting rules. Editing a repository YAML file does not retroactively change a job already stored in a build. Use a newly uploaded diagnostic step or a new build when a different agent query is required.

## Do not confuse agent priority with job priority

Agent priority influences which eligible agent receives work. Job priority influences which queued job is dispatched first. Raising a test job's priority does not require the scheduler to choose a different worker.

Similarly, assigning a higher priority to a particular agent generally makes it receive more eligible work, which may have the opposite effect from spreading retries. Use explicit placement policy for diagnosis and capacity controls for queue latency.

The [agent start reference](https://buildkite.com/docs/agent/cli/reference/start) documents the relevant startup options and tag configuration. Compare the running agent's reported tags with the configuration file; a restarted process may be using a different config path or environment override.

## Record enough information to compare attempts

Print harmless identity fields at the beginning of a repository script:

```bash
#!/usr/bin/env bash
set -euo pipefail

printf 'job=%s agent=%s retry=%s\n' \
  "$BUILDKITE_JOB_ID" \
  "$BUILDKITE_AGENT_ID" \
  "${BUILDKITE_RETRY_COUNT:-0}"
./scripts/test.sh
```

Use a repository script so these variables expand in the execution job, rather than during pipeline upload. Add a host identifier if different processes share a machine, but avoid printing entire environments or credential-related values.

## Validate the fallback deliberately

First test with two matching idle agents and confirm the retry can move. Then temporarily test with a single eligible worker and observe the documented fallback. Repeat with multiple processes on one host if that is how your fleet is configured.

Keep the observations alongside the failed test's logs. A different-agent retry that passes is evidence worth investigating, not proof that the test is correct. The objective is to make placement intentional enough to distinguish test flakiness from problems tied to a particular worker.

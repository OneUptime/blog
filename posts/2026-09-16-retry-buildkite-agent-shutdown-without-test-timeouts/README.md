# How to Retry Buildkite Jobs After Agent Shutdown Without Retrying Test Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Testing, Troubleshooting, DevOps

Description: Match Buildkite agent shutdown reasons and lost-agent exit statuses while leaving test failures and timeouts visible.

---

A test job interrupted by an agent shutdown should usually get another chance. A test job that exceeded its time budget should usually fail so somebody can investigate it. Both can involve termination signals, which makes a retry policy based only on exit code `143` or `137` too broad.

Classify the reason for termination before choosing the retry rule. An operating-system signal describes how a process stopped; Buildkite's signal reason describes why its infrastructure stopped the job.

## Match infrastructure failures explicitly

For a self-hosted Linux test queue, start with this policy:

```yaml
steps:
  - label: "Integration tests"
    key: integration-tests
    command: "bash .buildkite/scripts/integration-tests.sh"
    timeout_in_minutes: 25
    retry:
      automatic:
        - signal_reason: agent_stop
          limit: 2
        - exit_status: -1
          signal_reason: none
          limit: 2
```

The first rule handles jobs whose recorded reason is `agent_stop` and whose exit status matches the default nonzero process-status wildcard. The second handles the lost-agent exit status when no signal reason was recorded. Review your own lost-agent events before adopting the second rule: it deliberately does not include every failure that happens to have exit status `-1`.

There is no catch-all rule. Ordinary test failures and recorded timeout cancellations therefore remain failures unless they also match one of the stated conditions. Buildkite combines conditions within a rule with AND and evaluates rules in order. These mechanics, including reason values, are specified in the [retry reference](https://buildkite.com/docs/pipelines/configure/retry).

Do not add `retry.automatic: true` elsewhere through a template without checking the resulting step. That broad default retries failures you intended to leave visible.

## Separate timeout from cancellation

Buildkite uses the `cancel` signal reason for a timeout as well as cancellation-related stopping. A timed-out job can remain eligible for automatic retry, while a job ending in the canceled state is not automatically retried. Jobs in a canceled build are also excluded from automatic retry.

That distinction is why a rule matching `signal_reason: cancel` does not mean “retry only users' canceled jobs.” It can select precisely the timeouts this policy is meant to avoid.

Application timeouts introduce another case. A test runner may stop itself and return a normal nonzero status without Buildkite sending any signal. That should remain a test failure too. An infrastructure policy should not classify every invocation of GNU `timeout`, every killed subprocess, or every exit code `124` as an agent failure.

Buildkite's [job timeout guide](https://buildkite.com/docs/pipelines/configure/build-timeouts) explains the platform timeout settings. Compare the step limit with the pipeline and organization limits, then distinguish those from the test framework's own deadline.

## Inspect the original attempt

Record the failed attempt's job ID, agent name, agent version, exit status, signal, signal reason, and timestamps. Check its final log section alongside the machine's shutdown or autoscaling event. An abrupt loss might leave no final application log at all.

A sequence like “instance termination, agent stop, interrupted tests” supports an infrastructure retry. A sequence like “25-minute runtime, timeout, TERM, cleanup” supports investigating the test budget. Identical final shell statuses do not make those incidents equivalent.

Also inspect wrapper scripts. A wrapper that converts every nonzero result to `255` destroys useful distinctions. Preserve the child status where possible:

```bash
#!/usr/bin/env bash
set -uo pipefail

./scripts/run-integration-tests.sh
status=$?
# Upload diagnostics here without replacing the original test result.
exit "$status"
```

This script assumes the repository provides the test runner. It deliberately avoids `set -e` so the status can be captured immediately. Add diagnostics with their own error handling instead of accidentally exiting before the final `exit`.

## Give shutdown time to finish

Retries reduce the effect of interruption; they do not fix an overly aggressive termination policy. Check whether your autoscaler drains agents and whether the infrastructure gives the agent enough time to stop processes and upload logs.

The [agent configuration reference](https://buildkite.com/docs/agent/self-hosted/configure) distinguishes cancellation signal timing from final cleanup time. Tune these alongside the machine or pod termination window. Increasing an agent timeout cannot extend a cloud instance's already-expired shutdown deadline.

Keep retry limits small and account for their independent counters. Each rule in this example permits two retries, so alternating between the two failure categories can permit four retries and five total attempts, with corresponding database setup and compute costs. Make test-environment creation idempotent and scope temporary resources to the job attempt so a retry cannot corrupt its predecessor's leftovers.

## Test the policy as a decision table

Use a disposable pipeline and verify four separate scenarios: a normal assertion failure, an application-level timeout, a Buildkite step timeout, and a controlled agent shutdown. Add abrupt agent loss if your infrastructure routinely experiences it.

For each scenario, compare the observed reason with the policy and count the new attempts. Do not simulate infrastructure failure merely with `exit 143`; that exercises a shell result without necessarily producing the agent's recorded reason.

The desired outcome is specific: interrupted infrastructure work gets a bounded retry, while expensive or consistently failing tests retain an actionable failure signal. Revisit the table after agent upgrades or changes to the way your autoscaler terminates workers.

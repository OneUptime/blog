# How to Clean Up Buildkite Failures and Cancellations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Bash, Automation, DevOps

Description: Combine failure-tolerant cleanup steps, job-local shell traps, and external resource recovery for Buildkite cancellations and lost agents.

---

Buildkite can schedule a cleanup step after a failed test, but the same dependency settings do not guarantee cleanup after cancellation. Canceling a build stops pending work, including the cleanup job you hoped would release its resources.

Use different mechanisms for different lifetimes. A dependent cleanup step handles normal build failures. A shell trap or job hook handles local resources while the agent remains alive. An independent cleanup process handles remote resources left after cancellation, forced termination, or agent loss.

## Run a cleanup step after failures

For a shared test environment, use explicit dependencies and allow their failures:

```yaml
steps:
  - label: "Create test environment"
    key: create-environment
    command: "bash .buildkite/scripts/create-environment.sh"

  - label: "Integration tests"
    key: integration-tests
    depends_on: create-environment
    command: "bash .buildkite/scripts/integration-tests.sh"

  - label: "Remove test environment"
    key: remove-environment
    depends_on:
      - create-environment
      - integration-tests
    allow_dependency_failure: true
    command: "bash .buildkite/scripts/remove-environment.sh"
```

The scripts are your resource provider's create, test, and remove operations. Cleanup must tolerate both an absent environment and partially completed setup. Use a resource ID tied to the build so it cannot accidentally delete another build's environment.

The [dependency guide](https://buildkite.com/docs/pipelines/configure/depends-on) explicitly distinguishes failure from cancellation: `allow_dependency_failure: true` does not make subsequent steps execute after a canceled dependency. Likewise, a wait step's `continue_on_failure` supports failures, not cancellation.

Do not label this pattern an unconditional finalizer. It is a useful failure path with a specific scheduling boundary.

## Clean local state inside the owning job

For temporary files used only by one command, a Bash `EXIT` trap is simpler than another job:

```bash
#!/usr/bin/env bash
set -euo pipefail

job_tmpdir=$(mktemp -d)
cleanup() {
  original_status=$?
  trap - EXIT
  if ! rm -rf -- "$job_tmpdir"; then
    echo 'Temporary-directory cleanup failed' >&2
  fi
  exit "$original_status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

export TEST_TMPDIR="$job_tmpdir"
./scripts/run-tests.sh
```

The directory is created by this script, and the quoted cleanup target remains that directory. The trap preserves the original test or signal exit status instead of replacing a failure with successful cleanup.

This example handles normal shell exit and catchable interruption while the shell can still execute. It cannot run after `SIGKILL`, host loss, or a container being destroyed without a grace period. Child-process signal handling also matters: a shell waiting on a long-running foreground command may not run its trap immediately.

For remote resources, add a provider-specific cleanup call only if it can finish within the available termination window. A trap that takes several minutes is unlikely to complete during a short cancellation grace period.

## Use hooks for reusable job cleanup

A `pre-exit` job hook can centralize cleanup that every job on an agent or using a plugin needs. Buildkite's [hook lifecycle](https://buildkite.com/docs/agent/hooks) documents that hook as running before the job finishes.

Keep hook cleanup scoped to the current job. A hook on one parallel shard should not delete a database shared with other shards. Prefer names derived from `BUILDKITE_JOB_ID` for job-owned containers or directories, and use build-level ownership only when the pipeline graph manages that shared lifecycle.

Handle hook errors deliberately. Post-command and pre-exit failures can affect the final job exit status, so a diagnostic cleanup failure may otherwise replace the original test failure and change retry behavior. Log the cleanup problem while preserving the intended status policy.

## Account for cancellation time limits

The agent configuration exposes cancellation signal and timeout settings. Current agent documentation describes `cancel-signal-timeout` as the interval before an unresponsive subprocess receives `SIGKILL`.

A larger interval may let cooperative cleanup complete, but it also delays cancellation and does not solve a lost host. Tune it from observed cleanup time and the infrastructure's own shutdown limits. Kubernetes pod termination, instance shutdown, and container-stop policies must leave enough time for the agent's sequence too.

Do not confuse extra time for final log or artifact uploads with a guarantee that arbitrary external cleanup will run. Test the actual lifecycle on the platform hosting your agents.

## Add recovery outside the canceled build

Remote test databases, cloud instances, namespaces, and preview deployments should carry ownership metadata such as the build UUID, pipeline identity, and creation time. Add an expiration time when the resource lifecycle permits one.

Run a separate scheduled cleanup service or maintenance pipeline that is independent of the build being cleaned. It should select only resources it owns, consult the associated build state or expiration policy, and delete abandoned resources idempotently.

An expiration annotation is only data unless something actively enforces it. Buildkite does not automatically delete an arbitrary cloud resource because a build label contains a timestamp. Implement and monitor the recovery worker explicitly.

Keep deletion logs with the resource identity and reason. This helps distinguish expected cancellation cleanup from an environment removed while a legitimate long-running test was still using it.

## Verify all termination paths

Test successful completion, a test failure, setup failing halfway through, a canceled job, a canceled build, and forced agent termination. Confirm which mechanism runs in each case and whether the remote resource disappears within your chosen recovery window.

Also retry cleanup after it already succeeded. A repeated delete should be harmless. A recovery worker that requires a perfectly complete metadata record is insufficient when setup can fail before recording that record.

## Conclusion

Use dependent cleanup for failures, local traps or hooks for cooperative job termination, and an independent recovery process for cancellation and agent loss. No pending step inside a canceled build can provide a universal cleanup guarantee.

## Official Documentation

- [Buildkite dependency failure behavior](https://buildkite.com/docs/pipelines/configure/depends-on)
- [Wait steps and failure continuation](https://buildkite.com/docs/pipelines/configure/step-types/wait-step)
- [Agent hooks](https://buildkite.com/docs/agent/hooks)
- [Agent cancellation configuration](https://buildkite.com/docs/agent/self-hosted/configure)

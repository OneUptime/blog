# Set Deployment Retry Budgets Without Hiding Chronic Failures Behind Re-Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Deployment, Retry Budget, Observability, DevOps

Description: Bound deployment reruns with persistent attempt budgets, preserve first-attempt failure data, and escalate recurring faults even when retries succeed.

A deployment that fails every morning and succeeds on its second attempt still has a reliability problem. A dashboard showing only the final green result hides that problem while engineers absorb the delay and uncertainty.

A useful retry budget limits repeated work and preserves evidence of the original failure. Treat recovery and reliability as separate outcomes.

## Give deployment intent a persistent identity

Create a deployment operation ID before the first attempt. Associate it with the service, environment, immutable artifact digest, configuration revision, and approval. Record each execution under a separate attempt ID.

Keep the operation ID when an automatic retry, manual rerun, or replacement pipeline continues the same approved intent. A new CI run must not silently replenish its budget. An intentional deployment of changed code or configuration gets a new operation linked to its predecessor; recurring-failure tracking continues across both.

CI identifiers help with correlation but do not replace this model. In GitHub Actions, `GITHUB_RUN_ID` remains unchanged during reruns and `GITHUB_RUN_ATTEMPT` increases. A new workflow run has a different run ID, so the deployment controller still needs its own identity across replacement runs. See the [GitHub variables reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables).

## Classify failures before spending another attempt

Use evidence from the failed stage and the target environment:

| Failure | Automatic response |
| --- | --- |
| Runner setup failed before deployment began | Consider one retry on healthy infrastructure |
| Invalid manifest, missing permission, failed assertion | Stop and assign the defect |
| Request timed out after a deployment command was sent | Reconcile target state before deciding |
| Canary regression or migration failure | Follow the abort or recovery procedure |
| Unknown cause | Preserve diagnostics and investigate |

These are policy choices, not promises that a particular error will recover. A timeout does not prove the target performed no work. AWS's [retry guidance](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) explains why side effects require idempotency or equivalent protection before repeating an operation.

Retry the smallest safe unit. Rechecking rollout status is different from rerunning migrations, creating another release, or restarting every pod. Verify the earlier attempt has stopped or reconcile its outcome before admitting another mutation.

## Set three finite limits

Start with an explicit policy, then adjust it from observed recovery rates. For illustration:

- **Operation limit:** two total attempts, including the first.
- **Elapsed limit:** fifteen minutes from operation creation, including queueing, execution, and backoff.
- **Recurrence limit:** suspend automatic retries for a failure signature after it affects three distinct operations among the service/environment's latest twenty operations.

The numbers are suggested starting points, not industry requirements. A slow database migration may need a different elapsed limit; a non-repeatable operation may permit no automatic retry.

Use a stable signature such as stage, classified cause, and affected dependency. Strip request IDs and timestamps. Count affected operations once even when several attempts fail. Keep the suspension latched until an owner reviews the cause; allowing the window to move alone should not silently reopen it.

A small decision function makes the boundaries reviewable:

```python
def retry_decision(*, attempts_started, remaining_seconds,
                   delay_seconds, attempt_timeout_seconds,
                   failure_class, safe_to_repeat, suspended):
    if suspended:
        return "escalate_recurrence"
    if not safe_to_repeat:
        return "reconcile_or_stop"
    if failure_class not in {"runner_setup", "dependency_transient"}:
        return "stop_nonretryable"
    if attempts_started >= 2:
        return "stop_attempt_budget"
    if remaining_seconds <= delay_seconds + attempt_timeout_seconds:
        return "stop_time_budget"
    return "retry"
```

The class names are application-defined; they are not CI API values. Inputs come from validated policy and persisted history, with positive timeouts and nonnegative delays. The function does not implement scheduling, classification, or concurrency control.

In the controller, atomically reserve the next attempt against the operation record before dispatch. Check the deadline again after queueing and backoff. Use a finite worker timeout bounded by remaining time, and reconcile remote work when cancellation cannot prove it stopped. Two concurrent rerun requests must not each spend the last attempt.

## Make CI settings agree with the controller

Inventory retries in CI jobs, shell wrappers, deployment tools, and platform controllers. Assign one component responsibility for the operation budget; lower-level retries must fit within it.

GitLab's `retry:max` counts additional retries and accepts `0`, `1`, or `2`; `max: 1` therefore allows two executions. Use `retry:when` to restrict failure categories instead of enabling every failure. GitLab 19.1 reclassified some runner failures into `runner_external_dependency_failure` and `runner_interrupted`, so review your installed version and actual recorded reasons. See the [GitLab retry reference](https://docs.gitlab.com/ci/yaml/#retry).

A CI retry setting alone does not enforce your operation's elapsed deadline or recurrence suspension. Nor does a Kubernetes progress deadline stop a stalled rollout: Kubernetes reports `ProgressDeadlineExceeded`, leaving higher-level recovery decisions to an orchestrator. See [failed Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#failed-deployment).

## Preserve the first failure after recovery

Retain an append-only attempt history outside the runner: operation ID, attempt ID, trigger type, start/end times, failure class, original diagnostic reference, retry decision, and verified target outcome. Collect runner failures from the CI control plane because a lost runner cannot reliably upload its own final record.

For GitLab pipeline job collection, request `include_retried=true` and follow pagination. The default response excludes retried jobs, which can erase precisely the history this report needs. Keep job IDs for deduplication and `failure_reason` for classification. See the [Jobs API](https://docs.gitlab.com/api/jobs/#list-all-jobs-by-pipeline).

Report a closed cohort of operations with complete histories:

```text
First-attempt success rate = first-attempt successes / operations
Eventual success rate      = final verified successes / operations
Retry dependence           = successes after retry / operations
Attempt amplification      = attempts started / operations
```

For 100 operations, suppose 90 succeed immediately and all ten failures receive one retry. Eight recover and two remain failed. First-attempt success is 90%, eventual success is 98%, retry dependence is 8%, and amplification is 1.10. The green recovery does not remove the ten initial failures.

Show incomplete, canceled, and missing-history operations separately. Do not treat missing records as successes. These are pipeline reliability measures; a failed runner setup does not automatically mean a production change caused an incident.

## Turn repeated recovery into assigned work

On exhaustion, leave the operation failed or unresolved and route its complete attempt history to the responsible team. Page for customer impact or an unsafe deployment state; create a tracked defect for recurring pipeline friction. A successful retry can still update that defect.

Require any manual budget override to record an owner, reason, expiry, and additional allowance. After remediation, verify first-attempt reliability improves before restoring automatic retries. Otherwise the system has merely made a chronic fault easier to overlook.

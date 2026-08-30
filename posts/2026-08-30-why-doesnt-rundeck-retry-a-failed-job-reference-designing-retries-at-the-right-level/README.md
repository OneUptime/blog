# Why Rundeck Job Reference Retries Fail and Where to Retry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Retry, Retries, Automation, Troubleshooting

Description: Explain why a referenced job's Retry setting is ignored and place bounded, idempotent retries around the parent execution or the genuinely transient operation.

---

Rundeck's job-level **Retry** setting applies when that job is invoked directly. The official Creating Jobs documentation explicitly notes that Retry does not apply when the job is used as a **Job Reference**. A child job can therefore show `Retry: 3` in its definition yet fail once when embedded in a parent workflow.

That behavior is deliberate enough to design around. The parent owns the top-level workflow execution, and the Job Reference is a nested step rather than an independently started execution with the child's scheduling/retry lifecycle.

## Confirm the Invocation Path

Before changing retry counts, establish how the job started:

- GUI **Run Job Now**, schedule, API `POST /api/<version>/job/ID/run`, or `rd run`: direct invocation; job Retry applies.
- Job Reference step inside another job: referenced invocation; the child's job-level Retry does not apply.
- Retry-execution API/UI: creates a retry based on a prior failed execution and has separate semantics for failed nodes.

Inspect the execution tree and parent job definition. If the failing job is nested, increasing its Retry field will not change the reference behavior.

## Decide What Is Safe to Repeat

Retries are correct only for transient failures and idempotent operations. Classify the failing action:

| Failure | Retry? | Better response |
| --- | --- | --- |
| HTTP 503 or connection reset | Usually, bounded | Exponential backoff with jitter |
| Lock held by another process | Sometimes | Wait with a deadline or serialize |
| Invalid option/configuration | No | Fail validation immediately |
| Unauthorized/expired credential | Usually no | Rotate/fix authorization |
| Partial deployment | Only with state checks | Reconcile to desired state |
| Unknown timeout outcome | Carefully | Query operation by idempotency key |

Do not hide a deterministic failure behind three identical attempts. It lengthens incidents and increases load.

## Pattern 1: Retry the Narrow Operation

The safest retry is closest to the unstable boundary. Keep the child job referenced normally, but wrap only an idempotent API call or probe. In this example, the command's contract uses exit status 75 for a retryable transient failure and other nonzero statuses for permanent failures:

```bash
#!/usr/bin/env bash
set -euo pipefail

max_attempts=4
delay=2
retryable_exit=75

for attempt in $(seq 1 "$max_attempts"); do
  if /usr/local/bin/reconcile-release \
      --release "$RD_OPTION_RELEASE_ID" \
      --request-id "$RD_OPTION_REQUEST_ID"; then
    exit 0
  else
    status=$?
  fi

  if [ "$status" -ne "$retryable_exit" ]; then
    echo "reconcile failed permanently with exit status $status" >&2
    exit "$status"
  fi

  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "reconcile failed after $attempt attempts" >&2
    exit "$status"
  fi

  sleep "$delay"
  delay=$((delay * 2))
done
```

`reconcile-release` should use `request_id` as an idempotency key and inspect existing state. Add jitter in large fleets so many nodes do not retry simultaneously. Bound both each call's timeout and the total retry budget.

This pattern avoids repeating successful validation, approval, drain, or notification steps in the child.

## Pattern 2: Retry the Directly Invoked Parent

Set Retry on the top-level orchestration job that users, schedules, webhooks, or the API invoke directly. If an unhandled Job Reference fails, the parent fails; Rundeck can then retry that direct parent execution.

By default, this repeats the entire parent workflow, not merely the failed reference. Make every earlier step safe:

- Build/deploy by immutable release ID.
- Check whether a node is already drained before draining.
- Use upserts/reconciliation instead of blind creates.
- Deduplicate notifications by a stable request or operation ID, not the current execution ID.
- Store checkpoints in the target system, not only in transient job context.

Configure a delay in the Retry setting to avoid immediate pressure on a recovering dependency. Rundeck accepts a number of seconds or duration units such as `30s` and `5m`; it can also take documented option references for dynamic retry/delay values. Cap operator-controlled values with allowed inputs.

## Pattern 3: Create a Standalone Execution Deliberately

If the child must keep its own top-level retry lifecycle, invoke it through Rundeck's run-job API/CLI rather than a Job Reference, then monitor the returned execution and any automatic-retry successors until the chain reaches a terminal result. That creates an independently started execution to which the child's Retry setting can apply; each automatic retry is a fresh, linked execution.

This is a different architecture, with real costs:

- The parent must authenticate to the API.
- It must handle accepted-but-response-lost ambiguity.
- It must poll the execution chain with a deadline and propagate final failure.
- Logs and execution relationships are less naturally nested.
- Cancellation of the parent may not cancel the child automatically.

Use this only when independent execution ownership is required, not as a shortcut around reference semantics. Pass a request ID for correlation, enforce idempotency atomically in the child or target system, and use a recent/running-execution check only as a recovery aid.

## Avoid Recursive Retry Amplification

Do not combine four script attempts, three parent retries (four parent executions including the initial one), and an external alert sender's five webhook retries (six deliveries including the first) without calculating the product. That can create 96 calls, long after the incident state changed.

Set one retry owner per failure boundary. Document:

- Maximum attempts
- Per-attempt timeout
- Backoff and jitter
- Total elapsed deadline
- Idempotency key
- Errors that are retryable
- What state is checked before another attempt

Export attempt information in logs and metrics. Rundeck provides job retry context variables for direct retries; use them to make the attempt visible, not to skip correctness checks.

## Preserve the Original Failure

A retry wrapper must exit nonzero after the final failed attempt. Do not append `|| true`, configure error handling to "continue" without restoring failure, or let a cleanup/remediation reference turn the parent green. A failed remediation is still a failed execution and should remain visible to notifications and callers.

Test with a controlled transient failure that succeeds on attempt two, then a deterministic failure that exhausts the budget. Verify the final Rundeck status, number of side effects, delay, cancellation behavior, and logs.

## Conclusion

A referenced job's Retry field is ignored by documented design. Put retries around the smallest transient operation when possible, or on the directly invoked parent when the whole workflow is safely repeatable. Use a separate API-started child execution only when independent lifecycle ownership justifies its complexity. In every case, bound attempts and time, require idempotency, and preserve final failure.

## Official Documentation

- [Creating Jobs: Retry and Job Reference limitation](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html)
- [Built-in Node Steps: Job Reference](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html)
- [Rundeck Job JSON retry definition](https://docs.rundeck.com/docs/manual/document-format-reference/job-json-v44.html)
- [Rundeck API: Running a Job](https://docs.rundeck.com/docs/api/#running-a-job)
- [Rundeck API: Retry a Job Based on Execution](https://docs.rundeck.com/docs/api/#retry-a-job-based-on-execution)
- [Job Variables Reference](https://docs.rundeck.com/docs/manual/jobs/job-variables.html)

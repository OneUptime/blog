# How to Fix Dapr Workflow Stuck in Running State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Troubleshooting, State Management, Actor

Description: Learn how to diagnose and recover Dapr workflows that are stuck in a running state due to activity failures, actor issues, or state store problems.

---

Dapr Workflows (built on the Workflow Engine, which uses Actors internally) can become stuck in a `RUNNING` state when activity execution fails silently, the underlying state store is unavailable, or the workflow host loses its lock.

## Checking Workflow Status

Query the status of a specific workflow instance:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/<instance-id>
```

A stuck workflow returns:

```json
{
  "instanceID": "abc123",
  "createdAt": "2026-03-01T10:00:00Z",
  "lastUpdatedAt": "2026-03-01T10:01:00Z",
  "runtimeStatus": "RUNNING",
  "properties": {}
}
```

If `lastUpdatedAt` has not changed in a long time, the workflow is stuck.

## Common Causes

**Unhandled activity exception:** If an activity throws an unhandled exception and has no retry policy, the workflow waits forever for it to complete.

**State store unavailability:** Dapr Workflow uses the state store to persist execution history. If the state store becomes unavailable, workflows pause.

**Worker crash during execution:** If the workflow host process crashes mid-execution without completing an activity, the workflow waits for the activity result.

## Adding Retry Policies to Activities

Prevent infinite waits with timeouts and retries:

```python
import dapr.ext.workflow as wf
from datetime import timedelta

wfr = wf.WorkflowRuntime()

@wfr.activity(name="ProcessPayment")
def process_payment(ctx, order_id: str):
    # implementation

@wfr.workflow(name="ProcessOrder")
def process_order(ctx: wf.DaprWorkflowContext, order_id: str):
    try:
        result = yield ctx.call_activity(
            process_payment,
            input=order_id,
            retry_policy=wf.RetryPolicy(
                max_number_of_attempts=3,
                first_retry_interval=timedelta(seconds=5),
                backoff_coefficient=2.0
            )
        )
    except Exception as e:
        # Handle failure
        return {"status": "failed", "error": str(e)}
```

## Terminating a Stuck Workflow

To forcefully terminate a stuck workflow instance:

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/<instance-id>/terminate
```

Or purge it entirely (removes all history):

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/<instance-id>/purge
```

## Pausing and Resuming

If the underlying issue is temporary (state store restart), pause then resume:

```bash
# Pause
curl -X POST http://localhost:3500/v1.0/workflows/dapr/<instance-id>/pause

# After fixing the issue, resume
curl -X POST http://localhost:3500/v1.0/workflows/dapr/<instance-id>/resume
```

## Monitoring Workflow State

Enable structured logging to track workflow transitions:

```bash
dapr run --app-id workflow-app --log-level debug -- python app.py
```

Check for messages about activity scheduling and completion in the logs.

## Summary

Dapr workflows get stuck in a running state when activities fail without retry policies, the state store becomes unavailable, or the host crashes mid-execution. Add retry policies and timeouts to all activities, ensure the state store is highly available, and use the terminate or purge API to recover from permanently stuck instances.

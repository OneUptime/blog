# How to Debug Dapr Workflow Execution Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Debugging, Troubleshooting, Orchestration

Description: Learn how to diagnose and fix Dapr workflow execution problems including stuck workflows, activity failures, and state persistence issues using the workflow management API.

---

## Dapr Workflow Debugging Overview

Dapr workflows run as durable orchestrations backed by the actor subsystem. When a workflow stalls, fails, or produces unexpected results, debugging involves querying workflow state, inspecting execution history, checking activity task logs, and using the workflow management API to pause or terminate problematic instances.

## Querying Workflow Instance State

The Dapr workflow HTTP API exposes the state of any workflow instance:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/wf-instance-123
```

Response:

```json
{
  "instanceID": "wf-instance-123",
  "workflowName": "order-workflow",
  "createdAt": "2026-03-31T10:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:00:05Z",
  "runtimeStatus": "RUNNING",
  "properties": {
    "dapr.workflow.input": "{\"orderId\": \"order-456\"}",
    "dapr.workflow.custom_status": "Processing payment"
  }
}
```

Common `runtimeStatus` values:
- `RUNNING` - workflow is active
- `COMPLETED` - finished successfully
- `FAILED` - workflow threw an unhandled error
- `TERMINATED` - was manually terminated
- `SUSPENDED` - paused via API

## Checking Activity Task Failures

Activities within a workflow are logged individually. Check the Dapr sidecar logs for activity errors:

```bash
kubectl logs order-service-pod -c daprd | grep -i "activity\|workflow" | tail -50
```

Failed activity log:

```text
level=error msg="activity task failed" app_id=order-service workflowID=wf-instance-123 taskName=ProcessPayment err="payment gateway timeout"
```

## Reading Workflow Execution Logs from Your App

Add structured logging to each activity to make debugging easier:

```python
import logging
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext

logger = logging.getLogger(__name__)
wfr = WorkflowRuntime()

@wfr.activity(name="ProcessPayment")
def process_payment(ctx: WorkflowActivityContext, order_input: dict) -> dict:
    workflow_id = ctx.workflow_id
    task_id = ctx.task_id

    logger.info("Starting ProcessPayment", extra={
        "workflowId": workflow_id,
        "taskId": task_id,
        "orderId": order_input.get("orderId")
    })

    try:
        result = call_payment_gateway(order_input)
        logger.info("ProcessPayment succeeded", extra={"workflowId": workflow_id, "paymentId": result["paymentId"]})
        return result
    except Exception as e:
        logger.error("ProcessPayment failed", extra={"workflowId": workflow_id, "error": str(e)})
        raise
```

## Pausing and Resuming Stuck Workflows

If a workflow is stuck waiting for an external event or a slow activity, pause it to prevent resource consumption:

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/wf-instance-123/pause
```

After investigating and resolving the underlying issue, resume it:

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/wf-instance-123/resume
```

## Terminating and Purging Failed Workflows

Terminate a workflow that cannot recover:

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/wf-instance-123/terminate
```

After termination, purge the workflow history to free storage:

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/wf-instance-123/purge
```

## Debugging Workflow State Persistence

Dapr workflows persist state through the actor state store. If state is not saving correctly, check the state store:

```bash
# Inspect the workflow state keys in Redis (internal actor keys use the app ID prefix)
redis-cli -h redis -p 6379 KEYS "*order-service*wf-instance-123*"
```

If state keys are missing after a workflow starts, verify the actor state store component has `actorStateStore: "true"` and check for storage connectivity errors in the sidecar logs.

## Summary

Debugging Dapr workflow execution combines the workflow management HTTP API (for querying, pausing, and terminating instances) with sidecar logs (for activity-level errors). Structured logging in each activity with the workflow ID makes it easy to correlate application errors with specific workflow instances. When state persistence is suspected, querying the underlying actor state store directly confirms whether workflow state is being saved correctly.

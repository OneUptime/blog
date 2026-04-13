# How to Debug Dapr Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Debugging, Observability, Tracing, Logging

Description: Learn practical techniques for debugging Dapr Workflows including log inspection, workflow status queries, distributed tracing, and local step-by-step debugging.

---

## Common Workflow Debugging Challenges

Dapr Workflows are distributed and asynchronous, which makes debugging harder than single-process code. Common issues include activities silently failing, workflows getting stuck in pending states, and unexpected replays causing side effects. Understanding how to inspect state and traces is essential.

## Enabling Verbose Logging

Start the Dapr sidecar with debug-level logging to see workflow execution details:

```bash
dapr run --app-id myapp \
  --log-level debug \
  --app-port 6000 \
  -- python app.py
```

For Kubernetes, set the log level in the annotation:

```yaml
annotations:
  dapr.io/log-level: "debug"
```

## Querying Workflow Status

The workflow status API reveals the current state of any workflow instance:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/order_workflow/{instance_id}
```

Response fields to inspect:

```json
{
  "instanceID": "abc123",
  "workflowName": "order_workflow",
  "runtimeStatus": "RUNNING",
  "createdAt": "2026-03-31T10:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:01:30Z",
  "serializedInput": "{\"orderId\": \"ORD-1\"}",
  "serializedOutput": null,
  "serializedCustomStatus": "Processing payment"
}
```

The `runtimeStatus` values are `RUNNING`, `COMPLETED`, `FAILED`, `TERMINATED`, `PENDING`, and `SUSPENDED`.

## Setting Custom Status for Visibility

```python
def order_workflow(ctx: wf.DaprWorkflowContext, order: dict):
    ctx.set_custom_status("Reserving inventory")
    yield ctx.call_activity(reserve_inventory, input=order)

    ctx.set_custom_status("Charging payment")
    yield ctx.call_activity(charge_payment, input=order)

    ctx.set_custom_status("Done")
```

Polling custom status lets you track which step the workflow is on without reading logs.

## Inspecting Activity Errors

When an activity throws an exception, the workflow SDK captures it as a `TaskFailedError`. Log the cause in the workflow:

```python
from dapr.ext.workflow import WorkflowActivityContext
import logging

@wf.activity
def charge_payment(ctx: WorkflowActivityContext, order: dict) -> bool:
    try:
        resp = requests.post("http://payment/charge", json=order)
        resp.raise_for_status()
        return True
    except Exception as e:
        logging.error(f"Payment failed for order {order['id']}: {e}")
        raise
```

## Distributed Tracing with Zipkin

Configure Dapr to export traces:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprConfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
```

Workflow activities appear as child spans under the parent workflow span in Zipkin or Jaeger, giving you a full timeline.

## Pausing and Resuming for Inspection

Pause a running workflow to inspect its state without terminating it:

```bash
# Pause
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/order_workflow/{instance_id}/pause"

# Resume after inspection
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/order_workflow/{instance_id}/resume"
```

## Testing Determinism Issues

Dapr Workflow replays the workflow function on recovery. Any non-deterministic code (random numbers, timestamps, direct I/O) called outside activities will produce different results on replay. Use the workflow context for deterministic time:

```python
# Correct: use workflow context time
now = ctx.current_utc_datetime

# Wrong: non-deterministic, breaks replay
import datetime
now = datetime.datetime.utcnow()
```

## Summary

Debugging Dapr Workflows requires a combination of verbose logging, workflow status API queries, custom status messages, distributed tracing, and careful attention to determinism rules. Setting custom status at each step and using structured logging in activities gives you the observability needed to pinpoint failures quickly.

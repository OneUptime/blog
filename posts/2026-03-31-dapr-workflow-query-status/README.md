# How to Query Dapr Workflow Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Status, Monitoring, Operation

Description: Query Dapr workflow status using the SDK, HTTP API, and CLI to monitor progress, check completion, and build status dashboards for long-running workflows.

---

Monitoring running workflows requires querying their status. Dapr provides rich status information including runtime state, creation time, last update, input, and output. This guide covers querying individual instances and building status monitoring patterns.

## Runtime Status Values

| Status | Meaning |
|---|---|
| `RUNNING` | Workflow is actively executing |
| `COMPLETED` | Workflow finished successfully |
| `FAILED` | Workflow ended with an unhandled error |
| `TERMINATED` | Workflow was manually terminated |
| `SUSPENDED` | Workflow is paused |
| `PENDING` | Workflow scheduled but not yet started |

## Querying a Single Instance

Via SDK:

```python
from dapr.ext.workflow import DaprWorkflowClient

client = DaprWorkflowClient()

state = client.get_workflow_state("order-ORD-001")

if state:
    print(f"Instance ID: {state.instance_id}")
    print(f"Status: {state.runtime_status}")
    print(f"Created: {state.created_at}")
    print(f"Last Updated: {state.last_updated_at}")
    print(f"Input: {state.serialized_input}")
    print(f"Output: {state.serialized_output}")
    if state.failure_details:
        print(f"Error: {state.failure_details}")
else:
    print("Workflow not found")
```

Via HTTP API:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/order-ORD-001
```

Response:

```json
{
  "instanceID": "order-ORD-001",
  "workflowName": "order_workflow",
  "runtimeStatus": "COMPLETED",
  "createdAt": "2026-03-31T10:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:00:45Z",
  "properties": {}
}
```

Via CLI:

```bash
dapr workflow history order-ORD-001 --app-id order-service
```

## Polling Until Completion

Wait for a workflow to finish with a polling loop:

```python
import time

def wait_for_completion(instance_id: str, timeout: int = 300, interval: int = 5) -> str:
    elapsed = 0
    terminal = {"COMPLETED", "FAILED", "TERMINATED"}

    while elapsed < timeout:
        state = client.get_workflow_state(instance_id)
        if state and state.runtime_status in terminal:
            print(f"Workflow {instance_id} finished: {state.runtime_status}")
            return state.runtime_status

        print(f"Still {state.runtime_status if state else 'unknown'} - waiting...")
        time.sleep(interval)
        elapsed += interval

    raise TimeoutError(f"Workflow {instance_id} did not complete within {timeout}s")
```

## Blocking Wait via SDK

The SDK provides a built-in wait method:

```python
state = client.wait_for_workflow_completion(
    instance_id="order-ORD-001",
    timeout_in_seconds=120
)

print(f"Final status: {state.runtime_status}")
print(f"Output: {state.serialized_output}")
```

## Status Dashboard Pattern

Build a status summary for multiple workflows:

```python
import json
from datetime import timezone

def get_workflow_dashboard(instance_ids: list) -> dict:
    summary = {
        "RUNNING": [],
        "COMPLETED": [],
        "FAILED": [],
        "TERMINATED": [],
        "SUSPENDED": [],
        "UNKNOWN": []
    }

    for instance_id in instance_ids:
        state = client.get_workflow_state(instance_id)
        if state:
            status = state.runtime_status
            duration = None
            if state.created_at and state.last_updated_at:
                duration = (state.last_updated_at - state.created_at).total_seconds()
            summary[status].append({
                "id": instance_id,
                "duration_seconds": duration,
                "last_updated": state.last_updated_at.isoformat() if state.last_updated_at else None
            })
        else:
            summary["UNKNOWN"].append({"id": instance_id})

    return summary

dashboard = get_workflow_dashboard(["order-ORD-001", "order-ORD-002", "order-ORD-003"])
print(json.dumps(dashboard, indent=2))
```

## Exposing Workflow Status via REST

Build a status endpoint in your service:

```python
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/workflows/<instance_id>/status")
def workflow_status(instance_id):
    state = client.get_workflow_state(instance_id)
    if not state:
        return jsonify({"error": "not found"}), 404

    return jsonify({
        "id": state.instance_id,
        "status": state.runtime_status,
        "created_at": state.created_at.isoformat() if state.created_at else None,
        "output": state.serialized_output,
        "error": state.failure_details
    })
```

## Summary

Dapr provides comprehensive workflow status querying through SDK, HTTP API, and CLI. The SDK's `get_workflow_state()` returns rich metadata including runtime status, timing, input, output, and failure details. Build status dashboards by collecting state for multiple instances, and use the built-in `wait_for_workflow_completion()` for synchronous orchestration patterns where you need to block until a workflow finishes.

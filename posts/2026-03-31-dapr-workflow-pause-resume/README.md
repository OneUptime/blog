# How to Pause and Resume a Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Pause, Resume, Operation

Description: Learn how to pause and resume Dapr workflow instances using the SDK, HTTP API, and CLI for maintenance windows, manual intervention, and controlled processing.

---

Dapr workflows support pausing and resuming instances at runtime. This is useful for maintenance windows, waiting for manual approval, preventing a workflow from processing during an incident, or debugging a stuck workflow.

## Understanding Pause and Resume

When a workflow is paused:
- It stops executing new activities
- Currently running activities complete normally
- The workflow state is preserved in the state store
- External events queue up and are processed after resuming
- Timer deadlines are respected - if a timer fires while paused, it processes after resume

## Pausing via SDK

```python
from dapr.ext.workflow import DaprWorkflowClient

client = DaprWorkflowClient()

# Pause a running workflow
client.pause_workflow("order-processing-ORD-001")
print("Workflow paused")

# Verify the status
state = client.get_workflow_state("order-processing-ORD-001")
print(f"Status: {state.runtime_status}")  # SUSPENDED
```

## Resuming via SDK

```python
# Resume a paused workflow
client.resume_workflow("order-processing-ORD-001")
print("Workflow resumed")

state = client.get_workflow_state("order-processing-ORD-001")
print(f"Status: {state.runtime_status}")  # RUNNING
```

## Suspending and Resuming via CLI

```bash
# Pause
dapr workflow suspend order-processing-ORD-001 --app-id order-service

# Check status
dapr workflow history order-processing-ORD-001 --app-id order-service

# Resume
dapr workflow resume order-processing-ORD-001 --app-id order-service
```

## Pausing via HTTP API

```bash
# Pause
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/order-processing-ORD-001/pause

# Resume
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/order-processing-ORD-001/resume
```

## Use Case: Maintenance Window

Pause all running workflows during a database maintenance window:

```python
def pause_all_active_workflows(instance_ids: list):
    paused = []
    for instance_id in instance_ids:
        state = client.get_workflow_state(instance_id)
        if state and state.runtime_status == "RUNNING":
            client.pause_workflow(instance_id)
            paused.append(instance_id)
            print(f"Paused: {instance_id}")
    return paused

def resume_workflows(instance_ids: list):
    for instance_id in instance_ids:
        client.resume_workflow(instance_id)
        print(f"Resumed: {instance_id}")
```

## Use Case: Manual Approval Gate

Design a workflow that pauses itself for manual review by listening for an external event, but use pause/resume as an operational override:

```python
def reviewed_workflow(ctx: DaprWorkflowContext, params: dict):
    # Submit for review
    yield ctx.call_activity(submit_for_review, input=params)

    # Wait for human decision (or operator resume)
    decision = yield ctx.wait_for_external_event("review-decision")

    if decision.get("approved"):
        return (yield ctx.call_activity(execute_approved, input=params))
    else:
        return (yield ctx.call_activity(notify_rejected, input=params))
```

An operator can pause this workflow to prevent it from timing out while review is delayed, then resume it once the reviewer is ready.

## Checking Pause Status Before Operations

Before sending events to a workflow, verify it is running:

```python
def safely_send_event(instance_id: str, event_name: str, data: dict):
    state = client.get_workflow_state(instance_id)

    if state.runtime_status == "SUSPENDED":
        print(f"Workflow {instance_id} is paused - event will queue until resumed")
    elif state.runtime_status != "RUNNING":
        raise Exception(f"Workflow {instance_id} is not active: {state.runtime_status}")

    client.raise_workflow_event(instance_id, event_name, data)
```

## Summary

Dapr workflow pause and resume provide operational control over long-running processes. Paused workflows preserve all state and queue incoming events until resumed. Use pause/resume for maintenance windows, incident response, and manual intervention points. Events sent to paused workflows are buffered and processed in order after resumption, ensuring no data is lost during the suspension period.

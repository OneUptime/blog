# How to Raise Events to a Running Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, External Event, Event Driven, Orchestration

Description: Learn how to raise external events to running Dapr workflows to trigger approvals, inject updates, and implement human-in-the-loop patterns in your orchestration.

---

Dapr workflows can pause and wait for external events before continuing. This enables human-in-the-loop patterns, approval gates, and asynchronous callbacks from external systems. Raising events is how you resume waiting workflows with new data.

## Defining an Event Listener in a Workflow

Use `ctx.wait_for_external_event()` to pause the workflow until a named event arrives:

```python
from dapr.ext.workflow import DaprWorkflowContext, when_any
from datetime import timedelta

def approval_workflow(ctx: DaprWorkflowContext, request: dict):
    # Notify approver
    yield ctx.call_activity(send_approval_request, input=request)

    # Wait for the "approved" or "rejected" event
    decision = yield ctx.wait_for_external_event("approval-decision")

    if decision.get("approved"):
        result = yield ctx.call_activity(execute_request, input=request)
        return {"status": "approved", **result}
    else:
        yield ctx.call_activity(notify_rejection, input={
            "request_id": request["id"],
            "reason": decision.get("reason", "Rejected")
        })
        return {"status": "rejected"}
```

## Raising an Event via SDK

Send an event to the waiting workflow:

```python
from dapr.ext.workflow import DaprWorkflowClient

client = DaprWorkflowClient()

# Approve the request
client.raise_workflow_event(
    instance_id="approval-REQ-001",
    event_name="approval-decision",
    data={"approved": True, "approver": "alice@example.com"}
)
print("Approval event sent")
```

## Raising an Event via HTTP API

```bash
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/approval-REQ-001/raiseEvent/approval-decision" \
  -H "Content-Type: application/json" \
  -d '{"approved": true, "approver": "alice@example.com"}'
```

## Raising an Event via CLI

```bash
dapr workflow raise-event \
  --app-id approval-service \
  --input '{"approved":true}' \
  approval-REQ-001/approval-decision
```

## Timeout Pattern with Events

Race between an external event and a timer for deadline-driven workflows:

```python
def time_limited_approval(ctx: DaprWorkflowContext, request: dict):
    yield ctx.call_activity(send_approval_request, input=request)

    approval_task = ctx.wait_for_external_event("approval-decision")
    timeout_task = ctx.create_timer(
        ctx.current_utc_datetime + timedelta(hours=48)
    )

    winner = yield when_any([approval_task, timeout_task])

    if winner == timeout_task:
        yield ctx.call_activity(escalate_timeout, input=request)
        return {"status": "escalated"}

    decision = approval_task.get_result()
    return {"status": "decided", "approved": decision.get("approved")}
```

## Sending Sequential Events

A workflow can wait for multiple events in sequence:

```python
def multi_step_confirmation(ctx: DaprWorkflowContext, order: dict):
    # Wait for manager approval
    manager_approval = yield ctx.wait_for_external_event("manager-approved")
    if not manager_approval.get("approved"):
        return {"status": "rejected_by_manager"}

    # Wait for finance sign-off
    finance_approval = yield ctx.wait_for_external_event("finance-approved")
    if not finance_approval.get("approved"):
        return {"status": "rejected_by_finance"}

    result = yield ctx.call_activity(process_order, input=order)
    return {"status": "approved", **result}
```

Raise events in order:

```python
# Step 1: Manager approves
client.raise_workflow_event("order-ORD-001", "manager-approved", data={"approved": True})

# Step 2: Finance approves
client.raise_workflow_event("order-ORD-001", "finance-approved", data={"approved": True})
```

## Checking Workflow is Waiting Before Raising

Verify the workflow is in a state to receive events:

```python
from dapr.ext.workflow import WorkflowStatus

def safely_raise_event(instance_id: str, event_name: str, data: dict):
    state = client.get_workflow_state(instance_id)
    if not state:
        raise Exception(f"Workflow {instance_id} not found")
    if state.runtime_status != WorkflowStatus.RUNNING:
        raise Exception(f"Workflow {instance_id} is {state.runtime_status.name}, not RUNNING")

    client.raise_workflow_event(instance_id, event_name, data=data)
    print(f"Event '{event_name}' sent to workflow {instance_id}")
```

## Summary

Raising external events to Dapr workflows enables human-in-the-loop patterns, approval gates, and async callbacks. Workflows pause at `wait_for_external_event()` calls and resume the moment the named event arrives. Combine event waiting with timers to implement deadlines and escalation paths. Always verify workflow status before raising events to provide useful error feedback to callers.

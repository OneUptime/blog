# How to Use Dapr Workflow for Approval Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Approval, Human-in-the-Loop, External Event

Description: Build approval workflows in Dapr that pause for human decisions, support timeouts and escalation, and handle multi-level approval chains across microservices.

---

Approval workflows require human decisions before proceeding. Dapr's external event mechanism is purpose-built for this: workflows pause at an `await event` point and resume the moment a decision arrives, with full durability across restarts.

## Single-Level Approval Workflow

```python
from dapr.ext.workflow import DaprWorkflowContext, WorkflowActivityContext, when_any
from datetime import timedelta

def submit_for_review(ctx: WorkflowActivityContext, request: dict) -> dict:
    # Send email or Slack notification to approver
    approver_email = get_approver(request["department"])
    send_approval_email(approver_email, request)
    return {**request, "approver": approver_email, "submitted_at": "2026-03-31T10:00:00Z"}

def execute_approved_request(ctx: WorkflowActivityContext, request: dict) -> dict:
    # Carry out the approved action
    result = provision_resource(request)
    return {**request, "provisioned": True, "resource_id": result["id"]}

def notify_rejection(ctx: WorkflowActivityContext, request: dict) -> None:
    send_email(request["requester_email"], "request_rejected", request)

def approval_workflow(ctx: DaprWorkflowContext, request: dict):
    # Notify approver
    submitted = yield ctx.call_activity(submit_for_review, input=request)

    # Wait up to 72 hours for a decision
    approval_event = ctx.wait_for_external_event("approval-decision")
    timeout_event = ctx.create_timer(ctx.current_utc_datetime + timedelta(hours=72))

    winner = yield when_any([approval_event, timeout_event])

    if winner == timeout_event:
        yield ctx.call_activity(notify_rejection, input={
            **request, "reason": "No response within 72 hours"
        })
        return {"status": "timed_out", "request_id": request["id"]}

    decision = approval_event.get_result()

    if decision.get("approved"):
        result = yield ctx.call_activity(execute_approved_request, input=submitted)
        return {"status": "approved", "request_id": request["id"], **result}
    else:
        yield ctx.call_activity(notify_rejection, input={
            **request, "reason": decision.get("reason", "Declined")
        })
        return {"status": "rejected", "request_id": request["id"]}
```

## Multi-Level Approval Chain

Require sequential approvals from multiple stakeholders:

```python
def multi_level_approval_workflow(ctx: DaprWorkflowContext, request: dict):
    approvers = request.get("approval_chain", ["manager", "finance", "cto"])

    for level, approver_role in enumerate(approvers):
        yield ctx.call_activity(notify_approver, input={
            **request, "approver_role": approver_role, "level": level + 1
        })

        event = ctx.wait_for_external_event(f"decision-level-{level}")
        deadline = ctx.create_timer(ctx.current_utc_datetime + timedelta(hours=48))

        winner = yield when_any([event, deadline])

        if winner == deadline:
            yield ctx.call_activity(escalate, input={**request, "stuck_at": approver_role})
            return {"status": "escalated", "level": approver_role}

        decision = event.get_result()
        if not decision.get("approved"):
            yield ctx.call_activity(notify_rejection, input={
                **request, "rejected_by": approver_role, "reason": decision.get("reason")
            })
            return {"status": "rejected", "rejected_by": approver_role}

    # All levels approved
    result = yield ctx.call_activity(execute_approved_request, input=request)
    return {"status": "approved", **result}
```

## Building the Approval API

Create endpoints for approvers to submit their decisions:

```python
from flask import Flask, request as flask_request, jsonify
from dapr.ext.workflow import DaprWorkflowClient

app = Flask(__name__)
client = DaprWorkflowClient()

@app.route("/approve/<request_id>", methods=["POST"])
def approve(request_id):
    body = flask_request.json
    instance_id = f"approval-{request_id}"

    # For single-level approval
    client.raise_workflow_event(
        instance_id=instance_id,
        event_name="approval-decision",
        data={
            "approved": True,
            "approver": body.get("approver"),
            "comment": body.get("comment", "")
        }
    )
    return jsonify({"status": "decision_recorded"})

@app.route("/reject/<request_id>", methods=["POST"])
def reject(request_id):
    body = flask_request.json
    instance_id = f"approval-{request_id}"

    client.raise_workflow_event(
        instance_id=instance_id,
        event_name="approval-decision",
        data={
            "approved": False,
            "approver": body.get("approver"),
            "reason": body.get("reason", "Declined")
        }
    )
    return jsonify({"status": "decision_recorded"})
```

## Checking Approval Status

Let requesters check their approval status:

```python
@app.route("/requests/<request_id>/status")
def check_status(request_id):
    instance_id = f"approval-{request_id}"
    state = client.get_workflow_state(instance_id)
    if not state:
        return jsonify({"error": "not found"}), 404
    return jsonify({
        "request_id": request_id,
        "workflow_status": state.runtime_status,
        "result": state.serialized_output
    })
```

## Summary

Dapr workflows provide a clean foundation for approval processes. The `wait_for_external_event()` call pauses the workflow until a decision is raised, surviving restarts without losing state. Timeouts with `when_any()` implement escalation and deadline enforcement. Multi-level approval chains add sequential decision points while keeping orchestration logic centralized in one workflow function.

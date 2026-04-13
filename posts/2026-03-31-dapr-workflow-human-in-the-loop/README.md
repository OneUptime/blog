# How to Use Dapr Workflow for Human-in-the-Loop Processes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Human-in-the-Loop, Approval, External Event, Orchestration

Description: Learn how to build human-in-the-loop approval workflows using Dapr Workflow's external event API to pause execution and wait for human decisions.

---

## What Is a Human-in-the-Loop Workflow?

Human-in-the-loop (HITL) workflows pause execution at a decision point and wait for a human to approve, reject, or provide input before continuing. Examples include expense approval, content moderation, loan underwriting, and compliance sign-offs.

Dapr Workflow supports HITL natively via the `wait_for_external_event` API, which suspends the workflow without consuming resources while waiting.

## Designing an Approval Workflow

The flow for an expense approval:
1. Employee submits expense
2. Workflow notifies approver
3. Workflow waits indefinitely (or with timeout) for approval decision
4. Workflow continues based on decision

## Workflow Implementation in Python

```python
import dapr.ext.workflow as wf
from datetime import timedelta

def expense_approval_workflow(ctx: wf.DaprWorkflowContext, expense: dict):
    # Step 1 - send approval request notification
    yield ctx.call_activity(notify_approver, input={
        "expense": expense,
        "workflowId": ctx.instance_id
    })

    ctx.set_custom_status("Waiting for approval")

    # Step 2 - wait for human decision (timeout after 48 hours)
    approval_event = ctx.wait_for_external_event("approval_decision")
    timeout = ctx.create_timer(timedelta(hours=48))

    winner = yield wf.when_any([approval_event, timeout])

    if winner == timeout:
        yield ctx.call_activity(notify_timeout, input=expense)
        return {"status": "timeout", "expenseId": expense["id"]}

    decision = approval_event.get_result()

    # Step 3 - process based on decision
    if decision["approved"]:
        yield ctx.call_activity(process_reimbursement, input=expense)
        return {"status": "approved"}
    else:
        yield ctx.call_activity(notify_rejection, input={
            "expense": expense,
            "reason": decision.get("reason", "No reason provided")
        })
        return {"status": "rejected"}
```

## Activity: Notify the Approver

```python
wfr = WorkflowRuntime()

@wfr.activity(name='notify_approver')
def notify_approver(ctx, data: dict):
    expense = data["expense"]
    workflow_id = data["workflowId"]
    approval_url = f"http://myapp/approve?id={workflow_id}"

    requests.post("http://notifications/send", json={
        "to": expense["approverEmail"],
        "subject": f"Expense Approval Required: ${expense['amount']}",
        "body": f"Please review and approve: {approval_url}"
    })
```

## Sending the Human Decision Back

When the approver clicks approve/reject, your endpoint raises the external event:

```python
from flask import Flask, request
from dapr.clients import DaprClient

app = Flask(__name__)

@app.route("/approve", methods=["POST"])
def handle_approval():
    data = request.get_json()
    workflow_id = data["workflowId"]
    decision = {"approved": data["approved"], "reason": data.get("reason")}

    with DaprClient() as d:
        d.raise_workflow_event(
            instance_id=workflow_id,
            workflow_component="dapr",
            event_name="approval_decision",
            event_data=decision
        )
    return {"status": "decision recorded"}, 200
```

## Starting the Workflow

```python
with DaprClient() as d:
    result = d.start_workflow(
        workflow_component="dapr",
        workflow_name="expense_approval_workflow",
        input={
            "id": "EXP-456",
            "amount": 350.00,
            "description": "Team dinner",
            "approverEmail": "manager@example.com"
        }
    )
    print(f"Workflow started: {result.instance_id}")
```

## Checking Pending Approvals

```bash
curl http://localhost:3500/v1.0/workflows/dapr/{instance_id}
```

Look for `"runtimeStatus": "RUNNING"` and `"dapr.workflow.custom_status": "Waiting for approval"` in the `properties` object to find workflows awaiting human input.

## Summary

Dapr Workflow makes human-in-the-loop processes straightforward with the `wait_for_external_event` API. Workflows durably suspend while waiting for human input, support timeouts for unresponsive approvers, and resume immediately when a decision arrives - all without polling or custom state management.

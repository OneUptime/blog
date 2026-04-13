# How to Use Dapr Workflow for User Onboarding Flows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, User Onboarding, Automation, Email, Orchestration

Description: Learn how to build automated user onboarding workflows using Dapr Workflow, coordinating account setup, email sequences, and third-party integrations reliably.

---

## Onboarding Workflows Are Complex

User onboarding involves many coordinated steps: creating accounts in multiple systems, sending timed email sequences, provisioning resources, and waiting for user actions like email verification. Dapr Workflow handles this complexity with durable, resumable execution and built-in timer support.

## Example Onboarding Flow

1. Create user account in the database
2. Set up user's workspace
3. Send welcome email with verification link
4. Wait up to 7 days for email verification
5. If verified: send getting-started guide, provision trial resources
6. If not verified: send reminder, then deactivate account

## Workflow Implementation

```python
import dapr.ext.workflow as wf
from datetime import timedelta

wfr = wf.WorkflowRuntime()

@wfr.workflow(name='user_onboarding_workflow')
def user_onboarding_workflow(ctx: wf.DaprWorkflowContext, user: dict):
    ctx.set_custom_status("Creating account")

    # Step 1 - create account
    account = yield ctx.call_activity(create_user_account, input=user)

    # Step 2 - set up workspace
    ctx.set_custom_status("Setting up workspace")
    yield ctx.call_activity(setup_workspace, input={"userId": account["id"]})

    # Step 3 - send verification email
    yield ctx.call_activity(send_verification_email, input={
        "email": user["email"],
        "userId": account["id"],
        "workflowId": ctx.instance_id
    })

    ctx.set_custom_status("Waiting for email verification")

    # Step 4 - wait up to 7 days for verification
    verified_event = ctx.wait_for_external_event("email_verified")
    timeout = ctx.create_timer(timedelta(days=7))

    winner = yield wf.when_any([verified_event, timeout])

    if winner == timeout:
        # Send reminder, then deactivate
        yield ctx.call_activity(send_verification_reminder, input=user)
        reminder_timeout = ctx.create_timer(timedelta(days=3))
        second_attempt = ctx.wait_for_external_event("email_verified")
        winner2 = yield wf.when_any([second_attempt, reminder_timeout])

        if winner2 == reminder_timeout:
            yield ctx.call_activity(deactivate_unverified_account, input=account)
            return {"status": "unverified_deactivated", "userId": account["id"]}

    # Step 5 - verified path
    ctx.set_custom_status("Account verified - provisioning trial")
    yield ctx.call_activity(send_getting_started_guide, input=user)
    yield ctx.call_activity(provision_trial_resources, input=account)

    # Step 6 - schedule onboarding check-in after 3 days
    yield ctx.create_timer(timedelta(days=3))
    yield ctx.call_activity(send_checkin_email, input={
        "email": user["email"],
        "userId": account["id"]
    })

    ctx.set_custom_status("Onboarding complete")
    return {"status": "completed", "userId": account["id"]}
```

## Activity: Create User Account

```python
@wfr.activity(name='create_user_account')
def create_user_account(ctx: wf.WorkflowActivityContext, user: dict) -> dict:
    resp = requests.post("http://user-service/users", json={
        "email": user["email"],
        "name": user["name"],
        "plan": user.get("plan", "trial")
    })
    resp.raise_for_status()
    return resp.json()
```

## Confirming Email Verification

```python
from flask import Flask, request
from dapr.clients import DaprClient

app = Flask(__name__)

@app.route("/verify-email", methods=["GET"])
def verify_email():
    workflow_id = request.args.get("wfid")
    user_id = request.args.get("uid")

    with DaprClient() as d:
        d.raise_workflow_event(
            instance_id=workflow_id,
            workflow_component="dapr",
            event_name="email_verified",
            event_data={"userId": user_id, "verified": True}
        )

    return "Email verified! Redirecting...", 200
```

## Starting Onboarding

```python
with DaprClient() as d:
    instance = d.start_workflow(
        workflow_component="dapr",
        workflow_name="user_onboarding_workflow",
        instance_id=f"onboarding-{user_id}",
        input={
            "email": "alice@example.com",
            "name": "Alice Smith",
            "plan": "trial"
        }
    )
```

## Sending Timed Email Sequences

```python
@wfr.activity(name='send_getting_started_guide')
def send_getting_started_guide(ctx: wf.WorkflowActivityContext, user: dict):
    requests.post("http://email-service/send", json={
        "to": user["email"],
        "template": "getting-started",
        "data": {"name": user["name"]}
    })
```

## Summary

Dapr Workflow is an excellent fit for user onboarding because it handles long-running processes naturally - waiting days for email verification without polling, sending timed follow-up sequences using durable timers, and coordinating multiple services without complex state management code. The result is onboarding logic that is readable and reliable.

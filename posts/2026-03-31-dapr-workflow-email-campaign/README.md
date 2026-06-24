# How to Use Dapr Workflow for Email Campaign Orchestration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Email, Campaign, Marketing Automation, Orchestration

Description: Learn how to orchestrate multi-step email marketing campaigns using Dapr Workflow, with timed sequences, behavior-based branching, and A/B testing support.

---

## Email Campaigns as Workflows

An email campaign is a sequence of timed emails sent to subscribers based on their behavior. Drip campaigns, onboarding sequences, and re-engagement flows all follow this pattern. Dapr Workflow's durable timers and external event support make it ideal for orchestrating these sequences without cron jobs or custom state machines.

## Example: 7-Day Drip Campaign

1. Send Day 0 welcome email immediately
2. Wait 1 day, then send introduction email
3. If user opened introduction: send feature deep-dive
4. If not opened: send re-engagement email
5. Wait 3 days, then send case study
6. Final call-to-action email on day 7

## Workflow Implementation

```python
import dapr.ext.workflow as wf
from datetime import timedelta

def drip_campaign_workflow(ctx: wf.DaprWorkflowContext, subscriber: dict):
    campaign_id = subscriber["campaignId"]
    email = subscriber["email"]

    # Day 0 - welcome email
    yield ctx.call_activity(send_campaign_email, input={
        "email": email,
        "templateId": f"{campaign_id}-welcome",
        "subscriberId": subscriber["id"]
    })

    # Wait 1 day
    yield ctx.create_timer(timedelta(days=1))

    # Day 1 - introduction
    yield ctx.call_activity(send_campaign_email, input={
        "email": email,
        "templateId": f"{campaign_id}-intro",
        "subscriberId": subscriber["id"],
        "trackOpens": True,
        "workflowId": ctx.instance_id,
        "eventName": "intro_opened"
    })

    # Wait up to 24h for open event
    open_event = ctx.wait_for_external_event("intro_opened")
    open_timeout = ctx.create_timer(timedelta(hours=24))
    winner = yield wf.when_any([open_event, open_timeout])

    if winner == open_event:
        # Engaged path - send feature deep-dive
        yield ctx.call_activity(send_campaign_email, input={
            "email": email,
            "templateId": f"{campaign_id}-features",
            "subscriberId": subscriber["id"]
        })
    else:
        # Unengaged path - send re-engagement
        yield ctx.call_activity(send_campaign_email, input={
            "email": email,
            "templateId": f"{campaign_id}-reengage",
            "subscriberId": subscriber["id"]
        })

    # Wait 3 more days
    yield ctx.create_timer(timedelta(days=3))

    # Check if subscriber unsubscribed during the wait
    subscribed = yield ctx.call_activity(check_subscription_status, input=subscriber)
    if not subscribed:
        return {"status": "unsubscribed", "subscriberId": subscriber["id"]}

    # Day 5 - case study
    yield ctx.call_activity(send_campaign_email, input={
        "email": email,
        "templateId": f"{campaign_id}-casestudy",
        "subscriberId": subscriber["id"]
    })

    # Wait 2 more days
    yield ctx.create_timer(timedelta(days=2))

    # Day 7 - final CTA
    yield ctx.call_activity(send_campaign_email, input={
        "email": email,
        "templateId": f"{campaign_id}-cta",
        "subscriberId": subscriber["id"]
    })

    return {"status": "completed", "subscriberId": subscriber["id"]}
```

## Activity: Send Email via SendGrid

```python
def send_campaign_email(ctx, data: dict):
    payload = {
        "personalizations": [{"to": [{"email": data["email"]}]}],
        "from": {"email": "campaigns@example.com"},
        "template_id": data["templateId"],
        "dynamic_template_data": {"subscriberId": data["subscriberId"]}
    }

    if data.get("trackOpens") and data.get("workflowId"):
        # Add tracking pixel URL pointing to our webhook
        payload["dynamic_template_data"]["trackingUrl"] = (
            f"http://myapp/track/open?wfid={data['workflowId']}&event={data['eventName']}"
        )

    requests.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={"Authorization": f"Bearer {os.environ['SENDGRID_API_KEY']}"},
        json=payload
    )
```

## Email Open Tracking Webhook

```python
@app.route("/track/open", methods=["GET"])
def track_email_open():
    workflow_id = request.args.get("wfid")
    event_name = request.args.get("event")

    with DaprClient() as d:
        d.raise_workflow_event(
            instance_id=workflow_id,
            workflow_component="dapr",
            event_name=event_name,
            event_data={"opened": True}
        )

    # Return 1x1 tracking pixel
    pixel = b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x00\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b"
    return pixel, 200, {"Content-Type": "image/gif"}
```

## Enrolling Subscribers

```python
with DaprClient() as d:
    d.start_workflow(
        workflow_component="dapr",
        workflow_name="drip_campaign_workflow",
        instance_id=f"campaign-{campaign_id}-sub-{subscriber_id}",
        input={
            "id": subscriber_id,
            "email": "bob@example.com",
            "campaignId": "product-launch-2026"
        }
    )
```

## Summary

Dapr Workflow transforms email campaign orchestration by replacing cron jobs and state tables with readable workflow code. Durable timers handle timed sequences, external events enable behavior-based branching, and idempotent instance IDs ensure each subscriber receives each campaign exactly once.

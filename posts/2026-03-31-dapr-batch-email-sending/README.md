# How to Implement Batch Email Sending with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Email, Batch Processing, Binding, Workflow

Description: Learn how to build a reliable batch email sending system using Dapr bindings for SMTP delivery and Workflow for orchestration.

---

Sending thousands of emails reliably requires rate limiting, retry logic, and tracking delivery status. Dapr Workflow orchestrates the send sequence while the SMTP binding handles delivery, giving you durability without managing complex queue infrastructure yourself.

## Email Sending Architecture

```text
Trigger (Job/API) -> Dapr Workflow -> Fetch Recipients -> Fan-out: Send Email Per Recipient
                                                       -> Track Delivery Status
                                                       -> Summary Notification
```

## Configure SMTP Output Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: smtp-sender
spec:
  type: bindings.smtp
  version: v1
  metadata:
  - name: host
    value: smtp.sendgrid.net
  - name: port
    value: "587"
  - name: user
    secretKeyRef:
      name: email-secrets
      key: smtp-user
  - name: password
    secretKeyRef:
      name: email-secrets
      key: smtp-password
  - name: skipTLSVerify
    value: "false"
```

## Define the Batch Email Workflow

```python
import dapr.ext.workflow as wf
from dapr.ext.workflow import DaprWorkflowContext, WorkflowActivityContext

def batch_email_workflow(ctx: DaprWorkflowContext, campaign: dict):
    # Fetch all recipients
    recipients = yield ctx.call_activity(fetch_recipients, input=campaign['segmentId'])

    total = len(recipients)
    sent = 0
    failed = 0

    # Send emails in batches to respect rate limits
    batch_size = 50
    for i in range(0, total, batch_size):
        batch = recipients[i:i + batch_size]

        send_tasks = [
            ctx.call_activity(send_single_email, input={
                "recipient": r,
                "campaign": campaign
            })
            for r in batch
        ]
        results = yield wf.when_all(send_tasks)

        sent += sum(1 for r in results if r['success'])
        failed += sum(1 for r in results if not r['success'])

        # Wait between batches to respect rate limits
        if i + batch_size < total:
            yield ctx.create_timer(ctx.current_utc_datetime + timedelta(seconds=1))

    # Send summary notification
    yield ctx.call_activity(send_summary, input={
        "campaignId": campaign['campaignId'],
        "total": total,
        "sent": sent,
        "failed": failed
    })

    return {"sent": sent, "failed": failed, "total": total}
```

## Activity: Send Single Email

```python
def send_single_email(ctx: WorkflowActivityContext, params: dict) -> dict:
    from dapr.clients import DaprClient

    recipient = params['recipient']
    campaign = params['campaign']

    email_body = render_template(campaign['template'], recipient)

    try:
        with DaprClient() as client:
            client.invoke_binding(
                binding_name='smtp-sender',
                operation='create',
                data=email_body,
                binding_metadata={
                    "emailFrom": campaign['fromAddress'],
                    "emailTo": recipient['email'],
                    "subject": campaign['subject']
                }
            )

        # Track delivery
        track_email_sent(campaign['campaignId'], recipient['id'])
        return {"success": True, "recipientId": recipient['id']}

    except Exception as e:
        track_email_failed(campaign['campaignId'], recipient['id'], str(e))
        return {"success": False, "error": str(e)}
```

## Track Delivery Status with State

```python
def track_email_sent(campaign_id: str, recipient_id: str):
    with DaprClient() as client:
        client.save_state(
            store_name='statestore',
            key=f"email:{campaign_id}:{recipient_id}",
            value=json.dumps({
                "status": "sent",
                "sentAt": datetime.utcnow().isoformat()
            })
        )
```

## Trigger a Campaign

```python
@app.route('/campaigns/<campaign_id>/send', methods=['POST'])
def start_campaign(campaign_id: str):
    campaign = get_campaign(campaign_id)

    with DaprWorkflowClient() as client:
        instance_id = client.schedule_new_workflow(
            workflow=batch_email_workflow,
            input=campaign
        )

    return jsonify({"instanceId": instance_id}), 202
```

## Check Campaign Progress

```python
@app.route('/campaigns/<campaign_id>/status', methods=['GET'])
def campaign_status(campaign_id: str):
    instance_id = get_workflow_instance(campaign_id)

    with DaprWorkflowClient() as client:
        state = client.get_workflow_state(instance_id)

    return jsonify({
        "status": state.runtime_status.name,
        "result": state.serialized_output
    })
```

## Summary

Dapr Workflow orchestrates batch email campaigns by fetching recipients, sending in rate-limited batches using `when_all` for parallel sends within each batch, and waiting between batches to respect SMTP provider rate limits. The SMTP output binding handles delivery without SDK dependencies. Dapr state tracks per-recipient delivery status for analytics and retry of failed recipients.

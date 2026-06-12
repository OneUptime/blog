# How to Use PagerDuty with Slack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PagerDuty, Slack, Integration, ChatOps, Incident Management

Description: Learn how to integrate PagerDuty with Slack for real-time incident notifications, acknowledgment, and collaborative incident response.

---

## Why Integrate PagerDuty with Slack?

Teams already live in Slack. By bringing PagerDuty into Slack, you reduce context switching during incidents. Responders can acknowledge, escalate, and resolve incidents without leaving their chat window. Stakeholders get real-time updates in channels they already monitor.

## Integration Architecture

```mermaid
flowchart TD
    A[PagerDuty Incident] --> B[Slack Integration]
    B --> C[Incident Channel]
    B --> D[Team Channel]
    B --> E[Incident Cards]

    F[Slack Commands] --> G[/pd trigger]
    F --> H[/pd ack]
    F --> I[/pd resolve]
    F --> J[/pd oncall]

    G --> A
    H --> A
    I --> A
    J --> K[Show On-Call Schedule]
```

## Setting Up the Integration

### Step 1: Install the PagerDuty App

1. Go to your Slack workspace
2. Open the Apps directory
3. Search for PagerDuty
4. Click "Add to Slack"
5. Authorize the integration

### Step 2: Link Your PagerDuty Account

```bash
# In any Slack channel, run:

/pd oncall

# Follow the OAuth flow to link your PagerDuty user account
# This allows you to take actions on incidents from Slack
```

### Step 3: Configure Service Notifications

In PagerDuty, navigate to **Integrations > Slack Integration**, select your workspace, and add a Slack channel connection. You can also create the connection with the Slack Integration API after your PagerDuty account is mapped to the Slack workspace:

```python
import requests

def configure_slack_connection(api_key, workspace_id, service_id, slack_channel_id):
    """
    Configure Slack notifications for a PagerDuty service.
    """
    url = f"https://api.pagerduty.com/integration-slack/workspaces/{workspace_id}/connections"

    headers = {
        "Authorization": f"Token token={api_key}",
        "Accept": "application/vnd.pagerduty+json;version=2",
        "Content-Type": "application/json",
    }

    payload = {
        "slack_connection": {
            "source_id": service_id,
            "source_type": "service_reference",
            "channel_id": slack_channel_id,
            "notification_type": "responder",
            "config": {
                "events": [
                    "incident.triggered",
                    "incident.acknowledged",
                    "incident.escalated",
                    "incident.resolved",
                    "incident.reassigned",
                    "incident.annotated",
                    "incident.unacknowledged",
                    "incident.delegated",
                    "incident.priority_updated",
                    "incident.responder.added",
                    "incident.responder.replied",
                    "incident.status_update_published",
                    "incident.reopened",
                ],
                "priorities": ["*"],
                "urgency": "high",
            },
        }
    }

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()
```

## Slack Commands Reference

### Trigger an Incident

```text
/pd trigger
```

### Acknowledge an Incident

```text
/pd ack
# or click the "Acknowledge" button on the incident message
```

### Resolve an Incident

```text
/pd resolve
```

### Check Who Is On-Call

```text
/pd oncall
# Shows who is on call for a service
```

### Add a Note to an Incident

```text
/pd note Restarted the service, monitoring for recurrence
```

### Escalate an Incident

```text
/pd escalate
# Escalates to the next level in the escalation policy
```

## Notification Flow

```mermaid
sequenceDiagram
    participant M as Monitoring
    participant P as PagerDuty
    participant S as Slack
    participant R as Responder

    M->>P: Alert triggered
    P->>P: Create incident
    P->>S: Post to #incidents channel
    P->>S: Post incident card
    S->>R: Mobile/Desktop notification
    R->>S: Click "Acknowledge"
    S->>P: API call to acknowledge
    P->>S: Update incident message

    Note over R: Investigating...

    R->>S: /pd note Found the issue
    S->>P: Add note to incident
    R->>S: Click "Resolve"
    S->>P: API call to resolve
    P->>S: Update incident message (Resolved)
```

## Setting Up Dedicated Incident Channels

### Auto-Create Channels for Major Incidents

In PagerDuty, go to **Integrations > Slack Integration**, locate your workspace, click **View**, and modify **Channel Settings**. Toggle **Automatically create incident channels** on and configure the channel name, topic updates, bookmarks, and incident updates.

### Channel Naming Convention

```text
#inc-2026-01-28-database-timeout
#inc-2026-01-28-api-latency
#inc-2026-01-27-payment-failures
```

## Workflow Automation with Slack

### Incident Response Workflow

Create a Slack Workflow that runs when incidents are posted:

```yaml
# Slack Workflow Builder or Slack app configuration (conceptual)
workflow:
  name: "Incident Response Checklist"
  trigger:
    type: "new_message"
    channel: "#incidents"
    filter:
      app: "PagerDuty"
      contains: "triggered"

  steps:
    - action: "send_message"
      channel: "same"
      message: |
        Incident Response Checklist:
        - [ ] Join the incident channel
        - [ ] Review the alert details
        - [ ] Check relevant dashboards
        - [ ] Post initial assessment in 5 minutes
        - [ ] Update status page if customer-facing

    - action: "add_reaction"
      emoji: "eyes"
```

### Scheduled On-Call Notifications

```python
from slack_sdk import WebClient
import schedule
import time

slack_client = WebClient(token="xoxb-your-slack-token")

def post_oncall_reminder():
    """
    Post daily on-call schedule to team channel
    """
    # Fetch on-call from PagerDuty
    oncall = get_pagerduty_oncall()

    message = f"""
:rotating_light: *On-Call Today*

*Primary:* <@{oncall['primary']['slack_id']}> ({oncall['primary']['name']})
*Secondary:* <@{oncall['secondary']['slack_id']}> ({oncall['secondary']['name']})

_If you need to escalate an active incident, use `/pd escalate` from the incident's dedicated channel or contact the secondary._
"""

    slack_client.chat_postMessage(
        channel="C0123456789",
        text=message
    )

# Run every weekday at 9 AM
schedule.every().monday.at("09:00").do(post_oncall_reminder)
schedule.every().tuesday.at("09:00").do(post_oncall_reminder)
schedule.every().wednesday.at("09:00").do(post_oncall_reminder)
schedule.every().thursday.at("09:00").do(post_oncall_reminder)
schedule.every().friday.at("09:00").do(post_oncall_reminder)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## Best Practices for Slack Integration

### Channel Structure

```mermaid
flowchart TD
    subgraph "Recommended Channels"
        A[#incidents] --> B[All incident notifications]
        C[#incidents-p1] --> D[Critical incidents only]
        E[#oncall-handoff] --> F[Shift change discussions]
        G[#postmortems] --> H[Incident review threads]
    end
```

### Notification Routing

| Incident Priority | Channel | DM On-Call |
|-------------------|---------|------------|
| P1 (Critical) | #incidents-p1, #incidents | Yes |
| P2 (High) | #incidents | Yes |
| P3 (Medium) | #incidents | No |
| P4 (Low) | Service-specific channel | No |

### Message Threading

Keep incident discussions organized:

```python
def post_incident_update(slack_client, channel, thread_ts, update):
    """
    Post updates as thread replies to keep the main channel clean
    """
    slack_client.chat_postMessage(
        channel=channel,
        thread_ts=thread_ts,  # Reply to the original incident message
        text=update
    )
```

## Handling Common Scenarios

### Acknowledging from Mobile

The PagerDuty Slack message includes interactive buttons. Open the incident card in Slack mobile and tap "Acknowledge".

### Multiple Responders Coordinating

```text
# In the incident thread:
@alice I'm looking at the database metrics
@bob Can you check the API logs?
@carol Please update the status page

# Use reactions to track progress
# :white_check_mark: = task complete
# :eyes: = looking at it
# :question: = need help
```

### Escalating to Leadership

```text
/pd page
# or
/pd workflow
```

## Troubleshooting

### Messages Not Appearing

1. Check that the PagerDuty app is installed in the channel
2. Verify the service is configured to notify that channel
3. Confirm urgency filters are not blocking the notification

### Commands Not Working

```text
# Re-authenticate your connection
/pd oncall

# Check your PagerDuty user permissions
# You need appropriate role to take actions on incidents
```

### Missing Interactive Buttons

Ensure the PagerDuty app has the required OAuth scopes enabled, including:
- `app_mentions:read`
- `commands`
- `channels:manage`
- `channels:join`
- `chat:write`
- `chat:write.public`
- `users:read`
- `channels:read`

---

The PagerDuty-Slack integration transforms incident response from a disjointed scramble into a collaborative, centralized workflow. By meeting responders where they already work, you reduce response times and improve coordination. Start by routing your highest-priority incidents to Slack, then expand coverage as your team adapts to the ChatOps workflow.

# How to Configure Notifications in HCP Terraform (Slack, Email, Webhook)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Notifications, Slack, Webhook, DevOps

Description: Set up Slack, email, and webhook notifications in HCP Terraform to get alerted on run completions, failures, plan approvals, and other workspace events.

---

When a Terraform run fails at 2 AM or a production apply needs approval, you want to know about it immediately. HCP Terraform notifications send alerts to Slack, email, or custom webhooks when workspace events occur. Instead of watching the UI, your team gets notified in the channels they already use.

This guide covers configuring all three notification types with practical examples.

## Notification Triggers

HCP Terraform can notify you on these events:

- **run:created** - A new run was created
- **run:planning** - A run started planning
- **run:needs_attention** - A run needs manual confirmation or has policy overrides
- **run:applying** - A run started applying
- **run:completed** - A run finished successfully
- **run:errored** - A run failed

You pick which events matter for each notification channel. For production workspaces, you probably want `run:needs_attention`, `run:completed`, and `run:errored`. For dev workspaces, `run:errored` alone might be enough.

## Slack Notifications

### Setting Up via the UI

1. Create a Slack incoming webhook:
   - Go to your Slack workspace's app directory
   - Search for "Incoming Webhooks" and add it
   - Choose a channel and get the webhook URL

2. In HCP Terraform:
   - Navigate to your workspace
   - Click **Settings** > **Notifications**
   - Click **Create a notification**
   - Select **Slack** as the destination
   - Enter the webhook URL
   - Choose which events to notify on
   - Click **Create notification**

### Setting Up with the tfe Provider

```hcl
# Slack notification for production workspace
resource "tfe_notification_configuration" "prod_slack" {
  name             = "production-slack-alerts"
  enabled          = true
  workspace_id     = tfe_workspace.production.id
  destination_type = "slack"
  url              = var.slack_webhook_url

  triggers = [
    "run:needs_attention",  # Plan needs approval
    "run:completed",        # Apply succeeded
    "run:errored",          # Run failed
  ]
}

# Slack notification for all dev workspaces - only errors
resource "tfe_notification_configuration" "dev_slack" {
  for_each = {
    for name, ws in tfe_workspace.dev_workspaces : name => ws.id
  }

  name             = "${each.key}-slack-errors"
  enabled          = true
  workspace_id     = each.value
  destination_type = "slack"
  url              = var.slack_webhook_url_dev

  triggers = [
    "run:errored",
  ]
}
```

### What Slack Messages Look Like

When a notification fires, HCP Terraform sends a formatted Slack message:

```
HCP Terraform - production-networking
Run errored in workspace production-networking
Run ID: run-abc123
Message: Triggered by push to main by nawazdhandala
Link: https://app.terraform.io/app/acme/workspaces/production-networking/runs/run-abc123
```

The message includes the workspace name, run status, trigger details, and a direct link to the run.

## Email Notifications

Email notifications go to specific HCP Terraform users within your organization.

### Setting Up via the UI

1. Navigate to your workspace
2. Click **Settings** > **Notifications**
3. Click **Create a notification**
4. Select **Email** as the destination
5. Choose which organization members should receive emails
6. Select the trigger events

### Setting Up with the tfe Provider

```hcl
# Email notification to the platform team
resource "tfe_notification_configuration" "prod_email" {
  name             = "production-email-alerts"
  enabled          = true
  workspace_id     = tfe_workspace.production.id
  destination_type = "email"

  # Send to specific users (by their HCP Terraform user IDs)
  email_user_ids = [
    tfe_organization_membership.alice.user_id,
    tfe_organization_membership.bob.user_id,
  ]

  triggers = [
    "run:needs_attention",
    "run:errored",
  ]
}
```

Email notifications are useful as a backup when Slack is down, or for stakeholders who do not use Slack but need to know about production changes.

## Webhook Notifications

Generic webhooks send a JSON payload to any HTTP endpoint. This is how you integrate with PagerDuty, Microsoft Teams, custom dashboards, or any other tool that accepts webhooks.

### Setting Up with the tfe Provider

```hcl
# Generic webhook notification
resource "tfe_notification_configuration" "prod_webhook" {
  name             = "production-webhook"
  enabled          = true
  workspace_id     = tfe_workspace.production.id
  destination_type = "generic"
  url              = "https://hooks.example.com/terraform-events"
  token            = var.webhook_token  # Sent in the Authorization header

  triggers = [
    "run:created",
    "run:needs_attention",
    "run:completed",
    "run:errored",
  ]
}
```

### Webhook Payload Format

HCP Terraform sends a POST request with this JSON structure:

```json
{
  "payload_version": 1,
  "notification_configuration_id": "nc-abc123",
  "run_url": "https://app.terraform.io/app/acme/workspaces/production/runs/run-def456",
  "run_id": "run-def456",
  "run_message": "Triggered by push to main",
  "run_created_at": "2026-02-23T10:30:00Z",
  "run_created_by": "nawazdhandala",
  "workspace_id": "ws-xyz789",
  "workspace_name": "production-networking",
  "organization_name": "acme-infrastructure",
  "notifications": [
    {
      "message": "Run errored",
      "trigger": "run:errored",
      "run_status": "errored",
      "run_updated_at": "2026-02-23T10:35:00Z",
      "run_updated_by": null
    }
  ]
}
```

The `token` you configure is sent in the `Authorization` header as `Bearer <token>`, so your endpoint can verify the request is from HCP Terraform.

### Microsoft Teams Integration

Microsoft Teams uses a different webhook format. Use a middleware or transformation layer:

```hcl
# Option 1: Direct Teams webhook (limited formatting)
resource "tfe_notification_configuration" "teams" {
  name             = "production-teams"
  enabled          = true
  workspace_id     = tfe_workspace.production.id
  destination_type = "microsoft-teams"
  url              = var.teams_webhook_url

  triggers = [
    "run:needs_attention",
    "run:completed",
    "run:errored",
  ]
}
```

HCP Terraform natively supports Microsoft Teams as a destination type, formatting the message as a Teams card.

### PagerDuty Integration

Route critical failures to PagerDuty through a webhook that translates to PagerDuty events:

```python
# pagerduty_bridge.py - Translates HCP Terraform webhooks to PagerDuty events
from flask import Flask, request
import requests

app = Flask(__name__)
PAGERDUTY_KEY = "your-pagerduty-integration-key"

@app.route("/terraform-to-pagerduty", methods=["POST"])
def handle():
    payload = request.json

    for notification in payload.get("notifications", []):
        if notification["trigger"] == "run:errored":
            # Create a PagerDuty incident
            requests.post(
                "https://events.pagerduty.com/v2/enqueue",
                json={
                    "routing_key": PAGERDUTY_KEY,
                    "event_action": "trigger",
                    "payload": {
                        "summary": f"Terraform run failed in {payload['workspace_name']}",
                        "source": "hcp-terraform",
                        "severity": "critical",
                        "custom_details": {
                            "workspace": payload["workspace_name"],
                            "run_id": payload["run_id"],
                            "run_url": payload["run_url"],
                            "message": payload.get("run_message", ""),
                        }
                    },
                    "links": [
                        {
                            "href": payload["run_url"],
                            "text": "View Run in HCP Terraform"
                        }
                    ]
                }
            )

    return "", 200

if __name__ == "__main__":
    app.run(port=8080)
```

## Notification Strategies

### By Environment

```hcl
# Production: Slack + Email + PagerDuty
resource "tfe_notification_configuration" "prod_slack" {
  workspace_id     = tfe_workspace.production.id
  destination_type = "slack"
  url              = var.slack_webhook_prod
  triggers         = ["run:needs_attention", "run:completed", "run:errored"]
  # ...
}

resource "tfe_notification_configuration" "prod_pagerduty" {
  workspace_id     = tfe_workspace.production.id
  destination_type = "generic"
  url              = var.pagerduty_bridge_url
  triggers         = ["run:errored"]
  # ...
}

# Staging: Slack only
resource "tfe_notification_configuration" "staging_slack" {
  workspace_id     = tfe_workspace.staging.id
  destination_type = "slack"
  url              = var.slack_webhook_staging
  triggers         = ["run:errored"]
  # ...
}

# Dev: No notifications (or team-specific channel)
```

### By Team

Route notifications to team-specific channels:

```hcl
locals {
  team_channels = {
    platform = var.slack_webhook_platform
    app_team = var.slack_webhook_app_team
    data     = var.slack_webhook_data_team
  }
}

resource "tfe_notification_configuration" "team_alerts" {
  for_each = {
    for ws_name, ws in tfe_workspace.all :
    ws_name => ws if lookup(local.workspace_team_map, ws_name, null) != null
  }

  name             = "${each.key}-team-slack"
  enabled          = true
  workspace_id     = each.value.id
  destination_type = "slack"
  url              = local.team_channels[local.workspace_team_map[each.key]]

  triggers = ["run:needs_attention", "run:errored"]
}
```

## Testing Notifications

After configuring a notification, verify it works:

1. Go to the notification configuration in the workspace settings
2. Click **Send a test** to send a test payload
3. Check that the message arrives in your Slack channel, email, or webhook endpoint

For webhooks, check your server logs to see the incoming payload format. Adjust your handler accordingly.

## Wrapping Up

Notifications are essential for any team running Terraform in production. Set up Slack for real-time team visibility, email for stakeholders and backup alerting, and webhooks for integration with incident management tools like PagerDuty. The key is matching the notification urgency to the environment - production failures should wake someone up, while dev workspace errors can wait until morning. Configure notifications when you create workspaces, not after the first incident catches you off guard.

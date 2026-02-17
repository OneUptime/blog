# How to Configure Notification Channels for Email Slack and PagerDuty in Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Notifications, Slack, PagerDuty

Description: Set up notification channels in Google Cloud Monitoring for email, Slack, and PagerDuty to ensure the right people get alerted when monitoring policies trigger.

---

An alerting policy without a notification channel is like a smoke detector with no battery. It detects the fire but nobody knows about it. Google Cloud Monitoring supports multiple notification channel types including email, Slack, PagerDuty, SMS, webhooks, and mobile push notifications. Setting up the right channels ensures your alerts reach the right people through the right medium.

This guide covers configuring the three most common notification channels: email, Slack, and PagerDuty.

## Understanding Notification Channels

A notification channel in Cloud Monitoring is a destination where alert notifications are sent. Each alerting policy can reference multiple notification channels, so a single alert can go to both Slack and PagerDuty simultaneously.

Notification channels are project-level resources. Once created, they can be referenced by any alerting policy in the same project.

## Setting Up Email Notifications

Email is the simplest notification channel to set up. No integrations or tokens required.

```bash
# Create an email notification channel
gcloud alpha monitoring channels create \
  --display-name="On-Call Team Email" \
  --type=email \
  --channel-labels=email_address=oncall-team@company.com
```

You can also define it as JSON.

```json
{
  "type": "email",
  "displayName": "On-Call Team Email",
  "labels": {
    "email_address": "oncall-team@company.com"
  },
  "enabled": true
}
```

```bash
# Create from JSON file
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/my-project/notificationChannels" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @email-channel.json
```

For team notifications, use a group email address rather than individual addresses. This way you do not need to update the channel when team members change.

## Setting Up Slack Notifications

Slack integration requires setting up an incoming webhook or using the Cloud Monitoring Slack app.

The recommended approach is the Cloud Monitoring Slack app.

Step 1: Install the Google Cloud Monitoring app in your Slack workspace. Go to the Slack App Directory and search for "Google Cloud Monitoring."

Step 2: Create the notification channel through the Console or API.

Through the Console:

1. Go to Monitoring and then Alerting
2. Click Edit Notification Channels
3. Find Slack and click Add New
4. Authorize the connection to your Slack workspace
5. Select the channel where notifications should go
6. Give it a display name and save

Through the API, after the Slack integration is authorized:

```json
{
  "type": "slack",
  "displayName": "Production Alerts Slack Channel",
  "labels": {
    "channel_name": "#production-alerts",
    "auth_token": "YOUR_SLACK_AUTH_TOKEN"
  },
  "enabled": true
}
```

You can also use a Slack incoming webhook as an alternative.

```json
{
  "type": "webhook_tokenauth",
  "displayName": "Slack Webhook",
  "labels": {
    "url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
  },
  "enabled": true
}
```

The webhook approach is simpler to set up but provides less rich notification formatting compared to the native Slack integration.

## Setting Up PagerDuty Notifications

PagerDuty is the go-to for on-call management. Cloud Monitoring has a native PagerDuty integration.

Step 1: In PagerDuty, create a new service or use an existing one. Navigate to the service's Integrations tab and add a "Google Cloud Monitoring" integration. Copy the integration key.

Step 2: Create the notification channel in Cloud Monitoring.

```bash
# Create a PagerDuty notification channel
gcloud alpha monitoring channels create \
  --display-name="Production PagerDuty" \
  --type=pagerduty \
  --channel-labels=service_key=YOUR_PAGERDUTY_INTEGRATION_KEY
```

Or via the API:

```json
{
  "type": "pagerduty",
  "displayName": "Production PagerDuty",
  "labels": {
    "service_key": "YOUR_PAGERDUTY_INTEGRATION_KEY"
  },
  "enabled": true
}
```

```bash
# Create from JSON
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/my-project/notificationChannels" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @pagerduty-channel.json
```

PagerDuty notifications include incident creation, acknowledgment, and resolution. When the alert condition clears, Cloud Monitoring sends a resolution event that auto-resolves the PagerDuty incident (if configured).

## Setting Up Webhook Notifications

For custom integrations - Microsoft Teams, Discord, or your own services - use webhook notification channels.

```json
{
  "type": "webhook_tokenauth",
  "displayName": "Custom Alert Webhook",
  "labels": {
    "url": "https://my-service.run.app/alerts/webhook",
    "password": "your-webhook-secret"
  },
  "enabled": true
}
```

The webhook receives a JSON payload with alert details. Your service can then process it however you need - forward to Teams, create a Jira ticket, trigger a runbook, or send a custom notification.

## Setting Up SMS Notifications

For critical alerts, SMS ensures people are reachable even when they are away from their computer.

```bash
# Create an SMS notification channel
gcloud alpha monitoring channels create \
  --display-name="On-Call Phone" \
  --type=sms \
  --channel-labels=number="+15551234567"
```

SMS channels require phone number verification before they can receive notifications.

## Using Multiple Channels in an Alerting Policy

A well-designed alerting strategy uses multiple channels for different severity levels.

```json
{
  "displayName": "Production Database CPU Alert",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Database CPU above 90%",
      "conditionThreshold": {
        "filter": "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.9,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": [
    "projects/my-project/notificationChannels/SLACK_CHANNEL_ID",
    "projects/my-project/notificationChannels/PAGERDUTY_CHANNEL_ID",
    "projects/my-project/notificationChannels/EMAIL_CHANNEL_ID"
  ]
}
```

This sends the alert to Slack (for team visibility), PagerDuty (for on-call paging), and email (for audit trail).

## Managing Notification Channels

List and manage your notification channels from the CLI.

```bash
# List all notification channels
gcloud alpha monitoring channels list \
  --format="table(displayName, type, enabled, name)"

# Describe a specific channel
gcloud alpha monitoring channels describe CHANNEL_ID

# Disable a channel temporarily
gcloud alpha monitoring channels update CHANNEL_ID --no-enabled

# Re-enable a channel
gcloud alpha monitoring channels update CHANNEL_ID --enabled

# Delete a channel (only if not referenced by any alerting policy)
gcloud alpha monitoring channels delete CHANNEL_ID
```

## Verifying Notification Channels

Before relying on a channel, verify it works. Cloud Monitoring supports sending test notifications.

```bash
# Send a verification to an email channel (triggers a verification email)
gcloud alpha monitoring channels verify CHANNEL_ID
```

For Slack and PagerDuty channels, you can create a test alerting policy with a condition that immediately fires (like CPU > 0%) and verify the notification arrives.

## Setting Up Notification Channel Groups

For organizations with multiple teams, create separate notification channels per team and attach them to team-specific alerting policies.

```bash
# Backend team channels
gcloud alpha monitoring channels create \
  --display-name="Backend - Slack" \
  --type=slack \
  --channel-labels=channel_name="#backend-alerts"

gcloud alpha monitoring channels create \
  --display-name="Backend - PagerDuty" \
  --type=pagerduty \
  --channel-labels=service_key=BACKEND_PD_KEY

# Frontend team channels
gcloud alpha monitoring channels create \
  --display-name="Frontend - Slack" \
  --type=slack \
  --channel-labels=channel_name="#frontend-alerts"

gcloud alpha monitoring channels create \
  --display-name="Frontend - PagerDuty" \
  --type=pagerduty \
  --channel-labels=service_key=FRONTEND_PD_KEY
```

## Notification Rate Limiting

Cloud Monitoring applies rate limiting to prevent notification floods. By default, for a given alerting policy and notification channel, Cloud Monitoring sends at most one notification every 5 minutes while the condition is active. The auto-close period (default 7 days) determines when an incident automatically resolves if the condition clears.

You can customize the notification rate in the alerting policy.

```json
{
  "alertStrategy": {
    "notificationRateLimit": {
      "period": "300s"
    },
    "autoClose": "604800s"
  }
}
```

## Best Practices for Notification Channels

From experience setting up notifications across many teams:

- Use Slack for informational and warning-level alerts that the team should be aware of but do not require immediate action.
- Use PagerDuty for critical alerts that need someone to respond within minutes.
- Use email for audit trails and non-urgent notifications.
- Create dedicated Slack channels for alerts. Mixing alerts with general discussion means they get lost.
- Set up escalation policies in PagerDuty, not in Cloud Monitoring. Cloud Monitoring sends the alert; PagerDuty manages who gets paged and when it escalates.
- Test your channels regularly. A channel that silently broke three months ago is useless during an incident.
- Document which alerts go to which channels. Maintain a simple spreadsheet or wiki page mapping alert policies to notification channels.

## Summary

Notification channels are the delivery mechanism for your monitoring alerts. Email provides a simple, universal option. Slack gives your team real-time visibility. PagerDuty ensures the on-call engineer gets paged for critical issues. Set up all three and attach them to your alerting policies based on severity. The goal is making sure every alert reaches someone who can act on it through a channel they are actively watching.

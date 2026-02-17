# How to Configure Azure Service Health Notifications to Send to Microsoft Teams or Slack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Service Health, Microsoft Teams, Slack, Notifications, Azure Monitor, ChatOps

Description: Step-by-step instructions for routing Azure Service Health alerts directly to Microsoft Teams or Slack channels so your team stays informed.

---

Getting Azure Service Health alerts into the communication tools your team already uses is one of those small improvements that makes a big difference. Instead of relying on email (which gets buried) or expecting people to check the Azure portal (which they will not), you can push real-time health notifications directly into Microsoft Teams or Slack channels where your operations team lives.

In this post, I will walk through both approaches - Teams and Slack - with detailed configuration steps.

## The Architecture

The flow is straightforward:

```mermaid
graph LR
    A[Azure Service Health Event] --> B[Activity Log Alert Rule]
    B --> C[Action Group]
    C --> D{Notification Target}
    D --> E[Microsoft Teams Webhook]
    D --> F[Slack Webhook]
    D --> G[Azure Logic App]
```

There are two main approaches:

1. **Direct webhook** - send the alert payload directly to a Teams or Slack incoming webhook. Simple but the message formatting is basic.
2. **Logic App intermediary** - route the alert through a Logic App that formats the message nicely before sending it. More work to set up but produces much better-looking notifications.

I will cover both approaches for each platform.

## Sending to Microsoft Teams

### Approach 1: Direct Webhook via Workflows

Microsoft Teams supports incoming webhooks through the Workflows app (the old Incoming Webhook connector was retired). Here is how to set it up.

**Step 1: Create a workflow in Teams**

1. Open Microsoft Teams and go to the channel where you want notifications
2. Click the three dots on the channel name, then select "Workflows"
3. Choose "Post to a channel when a webhook request is received"
4. Name the workflow something like "Azure Service Health"
5. Select the team and channel
6. Copy the webhook URL that is generated

**Step 2: Create an Action Group with the webhook**

```bash
# Create an action group that sends to Teams via webhook
# The URI is the webhook URL you copied from Teams
az monitor action-group create \
  --resource-group rg-monitoring \
  --name ag-teams-service-health \
  --short-name teamsSH \
  --action webhook teams-channel "https://prod-XX.westus.logic.azure.com:443/workflows/YOUR_WORKFLOW_ID/triggers/manual/paths/invoke?..." \
  --tags environment=production
```

**Step 3: Create the Service Health alert**

```bash
# Create a Service Health alert linked to the Teams action group
az monitor activity-log alert create \
  --resource-group rg-monitoring \
  --name "ServiceHealth-Teams" \
  --description "Send Service Health alerts to Teams" \
  --condition category=ServiceHealth \
  --action-group ag-teams-service-health \
  --scope "/subscriptions/<your-subscription-id>"
```

The direct webhook approach works, but the message in Teams will be a raw JSON payload, which is not ideal for readability.

### Approach 2: Logic App with Formatted Adaptive Card

For a much nicer experience, use a Logic App to format the notification as an Adaptive Card.

**Step 1: Create a Logic App**

```bash
# Create a Logic App resource
az logic workflow create \
  --resource-group rg-monitoring \
  --name la-service-health-teams \
  --location eastus \
  --definition '{
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "triggers": {
        "manual": {
          "type": "Request",
          "kind": "Http",
          "inputs": {
            "schema": {}
          }
        }
      },
      "actions": {}
    }
  }'
```

**Step 2: Configure the Logic App in the portal**

Open the Logic App in the portal designer and build this flow:

1. Trigger: "When an HTTP request is received"
2. Parse JSON action to extract the Service Health alert fields
3. Compose action to build an Adaptive Card JSON
4. "Post adaptive card in a chat or channel" action using the Teams connector

Here is an example Adaptive Card body you can use in the Compose action:

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "size": "Large",
      "weight": "Bolder",
      "text": "Azure Service Health Alert",
      "color": "Attention"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Event Type:",
          "value": "@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['incidentType']}"
        },
        {
          "title": "Title:",
          "value": "@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['title']}"
        },
        {
          "title": "Service:",
          "value": "@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['service']}"
        },
        {
          "title": "Region:",
          "value": "@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['region']}"
        },
        {
          "title": "Status:",
          "value": "@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['stage']}"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['communication']}",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View in Azure Portal",
      "url": "https://portal.azure.com/#blade/Microsoft_Azure_Health/AzureHealthBrowseBlade/serviceIssues"
    }
  ]
}
```

**Step 3: Connect the alert to the Logic App**

Get the Logic App trigger URL and add it as a webhook in your action group:

```bash
# Get the Logic App trigger URL
CALLBACK_URL=$(az logic workflow show \
  --resource-group rg-monitoring \
  --name la-service-health-teams \
  --query "accessEndpoint" -o tsv)

# Update the action group to use the Logic App
az monitor action-group update \
  --resource-group rg-monitoring \
  --name ag-teams-service-health \
  --add-action webhook teams-logicapp "$CALLBACK_URL"
```

## Sending to Slack

### Approach 1: Direct Webhook

**Step 1: Create a Slack Incoming Webhook**

1. Go to https://api.slack.com/apps and create a new app (or use an existing one)
2. Enable "Incoming Webhooks" under Features
3. Click "Add New Webhook to Workspace"
4. Select the channel where you want notifications
5. Copy the webhook URL

**Step 2: Create an Action Group with the Slack webhook**

```bash
# Create an action group that posts to Slack
# The webhook URL is from your Slack app configuration
az monitor action-group create \
  --resource-group rg-monitoring \
  --name ag-slack-service-health \
  --short-name slackSH \
  --action webhook slack-channel "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
```

**Step 3: Create the alert rule**

```bash
# Create the Service Health alert for Slack
az monitor activity-log alert create \
  --resource-group rg-monitoring \
  --name "ServiceHealth-Slack" \
  --description "Send Service Health alerts to Slack" \
  --condition category=ServiceHealth \
  --action-group ag-slack-service-health \
  --scope "/subscriptions/<your-subscription-id>"
```

Note that the direct webhook sends the raw Azure alert JSON to Slack, which will display as a plain text block. It is functional but not pretty.

### Approach 2: Logic App with Slack Block Kit Formatting

For properly formatted Slack messages, use a Logic App.

**Step 1: Create the Logic App with a Slack message action**

Build a Logic App with these steps in the designer:

1. Trigger: "When an HTTP request is received"
2. Parse JSON to extract alert fields
3. HTTP action to call the Slack webhook with a formatted Block Kit payload

Here is an example of the HTTP action body for a nicely formatted Slack message:

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "Azure Service Health Alert"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Event Type:*\n@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['incidentType']}"
        },
        {
          "type": "mrkdwn",
          "text": "*Status:*\n@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['stage']}"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['title']}*\n@{triggerBody()?['data']?['context']?['activityLog']?['properties']?['communication']}"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View in Azure Portal"
          },
          "url": "https://portal.azure.com/#blade/Microsoft_Azure_Health/AzureHealthBrowseBlade/serviceIssues"
        }
      ]
    }
  ]
}
```

## Best Practices for Team Notifications

### Use Dedicated Channels

Create a dedicated channel in Teams or Slack for Azure health notifications. Do not dump them into your general ops channel where they will get lost in the noise.

### Separate Channels by Severity

Consider using different channels for different event types:
- **#azure-incidents** for service issues (high priority)
- **#azure-maintenance** for planned maintenance (informational)
- **#azure-advisories** for health and security advisories (low priority)

This keeps critical notifications visible and prevents alert fatigue.

### Include Action Links

Always include a direct link to the Azure portal Service Health page in your notification. When someone sees the alert, they should be able to click through to get full details immediately.

### Set Up Channel Notifications Appropriately

In Teams, configure the incidents channel to notify members for every new message. For the maintenance and advisories channels, a summary notification is fine.

In Slack, set the incidents channel to alert everyone using @channel mentions in your Logic App message format for critical issues.

### Test Before You Need It

Send a test notification before a real incident happens. Use the "Test action group" feature in Azure Monitor to verify the entire chain works - from alert to action group to webhook to your Teams or Slack channel.

## Troubleshooting Common Issues

**Webhook returns 403 or 404:** Double-check the webhook URL. Teams workflow URLs and Slack webhook URLs expire or get rotated. If you regenerated the webhook, update the action group.

**Messages arrive but are unformatted:** This means you are using the direct webhook approach. Switch to the Logic App approach for formatted messages.

**Messages are delayed:** Azure alert processing can take 1-5 minutes. The Logic App adds a few seconds. If you are seeing delays longer than 10 minutes, check the Logic App run history for failures.

**No messages at all:** Check the action group test feature first. Then check the alert rule to make sure it is enabled and scoped correctly. Finally, check the Logic App run history for errors.

## Wrapping Up

Routing Azure Service Health notifications to Teams or Slack takes your team from reactive (checking the portal after users complain) to proactive (seeing the alert in real time alongside their teammates). The direct webhook approach works in minutes for basic notifications, while the Logic App approach gives you polished, formatted messages that are easy to read and act on. Pick the approach that matches your team's needs and tolerance for setup complexity, and make sure to test it before the next Azure incident hits.

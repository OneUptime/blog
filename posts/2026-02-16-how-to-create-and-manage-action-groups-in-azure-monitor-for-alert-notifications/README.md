# How to Create and Manage Action Groups in Azure Monitor for Alert Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Monitor, Action Groups, Alert Notifications, Azure Alerts, Incident Management, Cloud Monitoring

Description: Learn how to create and manage Azure Monitor action groups to route alert notifications through email, SMS, webhooks, and automated workflows.

---

When an alert fires in Azure Monitor, the action group determines what happens next. Does someone get an email? A text message? Does a webhook call your incident management system? Does an Azure Function run to auto-remediate the issue? Action groups are the notification and automation layer that sits between alert rules and your team.

Getting action groups right is important because a perfectly tuned alert is useless if the notification never reaches the right person. In this post, I will walk through creating action groups, configuring different notification types, managing them at scale, and sharing some patterns I have found work well in production environments.

## What Is an Action Group?

An action group is an Azure resource that defines a collection of notification preferences and automated actions. When an alert rule fires, it triggers one or more action groups, and each action group executes all of its configured actions.

A single action group can contain multiple actions of different types. For example, one action group might send an email to the on-call engineer, post a message to a Slack channel via webhook, and trigger an Azure Logic App to create a ticket in ServiceNow.

## Notification Types

Action groups support these notification types:

- **Email** - Sends an alert email to a specified address. Supports Azure Resource Manager (ARM) roles too, so you can email everyone with the "Owner" role on a subscription.
- **SMS** - Sends a text message to a phone number. Subject to rate limits (1 SMS per 5 minutes per phone number).
- **Push notification** - Sends to the Azure mobile app.
- **Voice call** - Calls a phone number with a recorded message.

## Action Types

Beyond notifications, you can trigger automated actions:

- **Webhook** - Sends an HTTP POST to a URL with the alert payload.
- **Azure Function** - Invokes an Azure Function.
- **Logic App** - Triggers an Azure Logic App workflow.
- **Automation Runbook** - Runs an Azure Automation runbook.
- **ITSM** - Creates a ticket in a connected ITSM tool (ServiceNow, etc.).
- **Event Hub** - Sends the alert to an Event Hub for streaming.
- **Secure Webhook** - Webhook with Azure AD authentication.

## Step 1: Create an Action Group in the Portal

1. Go to **Azure Monitor** in the portal.
2. Click **Alerts** in the left menu.
3. Click **Action groups** at the top.
4. Click **Create**.

Fill in the basics:

5. **Subscription** - Select your subscription.
6. **Resource group** - Pick a resource group (I recommend having a dedicated `rg-monitoring` group).
7. **Action group name** - A descriptive name like "Ops Team Notifications".
8. **Display name** - A short name (max 12 characters) shown in SMS and email subjects.

## Step 2: Add Notifications

Click the **Notifications** tab:

1. For **Notification type**, select **Email/SMS message/Push/Voice**.
2. Give it a name like "On-call email".
3. In the configuration pane, check **Email** and enter the address.
4. Optionally check **SMS** and enter a phone number.
5. Click **OK**.

You can add multiple notification entries. For example, you might have one entry for the primary on-call and another for the team lead.

To send email to everyone with a specific Azure role, select **Email Azure Resource Manager Role** as the notification type and pick the role (Owner, Contributor, Reader, etc.).

## Step 3: Add Actions

Click the **Actions** tab:

1. For **Action type**, select the action you want (Webhook, Azure Function, Logic App, etc.).
2. Give it a name like "PagerDuty webhook".
3. Configure the action-specific settings.

For a webhook, you provide the URI. The alert payload is sent as JSON in the POST body. Here is a sample payload structure.

```json
{
  "schemaId": "azureMonitorCommonAlertSchema",
  "data": {
    "essentials": {
      "alertId": "/subscriptions/.../alerts/...",
      "alertRule": "High CPU Alert",
      "severity": "Sev2",
      "signalType": "Metric",
      "monitorCondition": "Fired",
      "monitoringService": "Platform",
      "alertTargetIDs": ["/subscriptions/.../virtualMachines/web-01"],
      "firedDateTime": "2026-02-16T14:30:00Z",
      "description": "CPU exceeded normal range"
    },
    "alertContext": {
      "properties": null,
      "conditionType": "SingleResourceMultipleMetricCriteria",
      "condition": {
        "windowSize": "PT5M",
        "allOf": [
          {
            "metricName": "Percentage CPU",
            "metricValue": 94.5,
            "operator": "GreaterThan",
            "threshold": "90",
            "timeAggregation": "Average"
          }
        ]
      }
    }
  }
}
```

## Step 4: Enable the Common Alert Schema

I strongly recommend enabling the common alert schema. By default, different alert types (metric, log, activity log) send different JSON payloads, which makes building integrations painful. The common alert schema standardizes the structure so your webhook or function can handle all alert types with one parser.

In the action group creation form, under each action, you will see a toggle for **Enable common alert schema**. Turn it on.

## Creating Action Groups with Azure CLI

For automation, use the CLI. Here is how to create an action group with email and webhook actions.

```bash
# Create an action group with email and webhook notifications
az monitor action-group create \
  --resource-group rg-monitoring \
  --name "ops-team" \
  --short-name "OpsTeam" \
  --action email on-call-email ops@example.com \
  --action webhook pagerduty-hook "https://events.pagerduty.com/integration/<key>/enqueue"
```

To add an SMS action, use this syntax.

```bash
# Add SMS notification to an existing action group
az monitor action-group update \
  --resource-group rg-monitoring \
  --name "ops-team" \
  --add-action sms on-call-sms 1 5551234567
```

## Creating Action Groups with ARM Templates

For repeatable deployments, ARM templates are the way to go.

```json
{
  "type": "Microsoft.Insights/actionGroups",
  "apiVersion": "2023-01-01",
  "name": "ops-team",
  "location": "Global",
  "properties": {
    "groupShortName": "OpsTeam",
    "enabled": true,
    "emailReceivers": [
      {
        "name": "on-call-email",
        "emailAddress": "ops@example.com",
        "useCommonAlertSchema": true
      }
    ],
    "smsReceivers": [
      {
        "name": "on-call-sms",
        "countryCode": "1",
        "phoneNumber": "5551234567"
      }
    ],
    "webhookReceivers": [
      {
        "name": "pagerduty-hook",
        "serviceUri": "https://events.pagerduty.com/integration/<key>/enqueue",
        "useCommonAlertSchema": true
      }
    ]
  }
}
```

## Organizing Action Groups for Different Scenarios

In practice, you will want multiple action groups for different situations. Here is a pattern that works well.

**ag-critical** - For severity 0 and 1 alerts. Sends SMS, email, voice call, and triggers PagerDuty. This is for outages.

**ag-warning** - For severity 2 alerts. Sends email and posts to a Teams/Slack channel. No phone calls.

**ag-informational** - For severity 3 and 4 alerts. Posts to a monitoring channel only. No direct notifications.

**ag-auto-remediate** - Triggers an Azure Function or Automation runbook to attempt automatic recovery. You might combine this with ag-critical so that auto-remediation runs while someone is also paged.

## Rate Limiting and Throttling

Azure enforces rate limits on action groups to prevent notification storms:

- **Email**: No more than 100 emails per hour per action group.
- **SMS**: No more than 1 SMS per 5 minutes per phone number.
- **Voice**: No more than 1 voice call per 5 minutes per phone number.
- **Webhook**: 10 webhook calls per action group per minute, with automatic retry on failure.
- **Azure Function/Logic App**: Subject to the function/logic app's own scaling limits.

If your alerts fire frequently, these limits can cause missed notifications. To mitigate this, make sure your alert rules have appropriate evaluation frequencies and use the "number of violations" setting to avoid firing on every single data point.

## Testing Action Groups

You can test an action group without waiting for a real alert to fire. In the portal, go to the action group, click **Test action group** at the top, select a sample alert type, and click **Test**. This sends a test notification through all configured actions so you can verify everything is wired up correctly.

From the CLI, you can test like this.

```bash
# Test an action group
az monitor action-group test-notifications create \
  --resource-group rg-monitoring \
  --action-group-name "ops-team" \
  --alert-type metricstaticthreshold \
  --add-action email on-call-email ops@example.com
```

## Managing Action Groups Across Subscriptions

If you have a multi-subscription environment, you can reference an action group in one subscription from an alert rule in another subscription. Just use the full resource ID of the action group.

For centralized management, create all your action groups in a shared monitoring subscription and reference them from alert rules across your organization. This way, when you need to update a notification endpoint, you change it in one place.

## Suppression Rules

Sometimes you need to temporarily silence notifications - during a maintenance window, for example. Azure Monitor supports alert processing rules (formerly called action rules) that can suppress all notifications for a specific scope during a defined time window.

```bash
# Create an alert processing rule to suppress alerts during maintenance
az monitor alert-processing-rule create \
  --name "maintenance-window" \
  --resource-group rg-monitoring \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-prod" \
  --rule-type RemoveAllActionGroups \
  --schedule-recurrence-type Daily \
  --schedule-start-datetime "2026-02-17 02:00:00" \
  --schedule-end-datetime "2026-02-17 04:00:00"
```

## Wrapping Up

Action groups are the delivery mechanism for Azure Monitor alerts. Spend time organizing them by severity level and use case, enable the common alert schema for consistent payloads, and test them regularly. A monitoring system is only as good as its ability to reach the right people at the right time, and action groups are how you make that happen.

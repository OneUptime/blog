# How to Set Up Azure Service Health Alerts for Outages Affecting Your Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Service Health, Monitoring, Alerts, Incident Management, Azure Monitor, Reliability

Description: Step-by-step guide to configuring Azure Service Health alerts so your team gets notified instantly when Azure outages affect your specific resources.

---

There is nothing worse than finding out about an Azure outage from your customers instead of from Azure itself. Azure Service Health gives you personalized visibility into the health of the Azure services and regions you actually use, but it only works if you set up alerts. By default, Service Health information just sits in the portal waiting for someone to check it. In this post, I will walk through how to configure Service Health alerts so your team gets proactive notifications the moment something goes wrong.

## Understanding Azure Service Health

Azure Service Health is actually a collection of three related services:

- **Azure Status** - the public status page at status.azure.com that shows broad, global Azure health
- **Service Health** - personalized health tracking scoped to the services and regions you use
- **Resource Health** - individual resource-level health, like whether a specific VM is running or impaired

For alerting on outages, Service Health is the layer you want. It tracks four types of events:

1. **Service issues** - active problems affecting Azure services right now
2. **Planned maintenance** - upcoming maintenance that might impact your resources
3. **Health advisories** - changes in Azure services that require your attention (deprecations, feature changes)
4. **Security advisories** - security-related notifications for Azure services

## Setting Up Alerts Through the Azure Portal

The fastest way to get started is through the portal. Here is the step-by-step process.

### Step 1: Navigate to Service Health

Open the Azure portal and search for "Service Health" in the top search bar. Click on it to open the Service Health dashboard. You will see a map showing the current health status of Azure services in the regions relevant to your subscriptions.

### Step 2: Create a New Alert Rule

Click on "Health alerts" in the left menu, then click "+ Create service health alert" at the top.

### Step 3: Configure the Scope

Choose which subscriptions, services, and regions you want to monitor. My recommendation is to start by selecting all services and all regions that your resources are deployed to. You can always narrow this down later.

The key selections are:
- **Subscription(s)** - select the subscriptions you want coverage for
- **Service(s)** - select the specific Azure services you use (Virtual Machines, App Service, SQL Database, etc.)
- **Region(s)** - select only the regions where you have deployments

### Step 4: Choose Event Types

Select which types of health events should trigger the alert:
- Service issue (you almost certainly want this)
- Planned maintenance (recommended)
- Health advisory (recommended)
- Security advisory (recommended)

I recommend enabling all four types initially. You can always create separate alerts with different action groups if you want service issues to page your on-call team while health advisories just send an email.

### Step 5: Create or Select an Action Group

Action groups define what happens when the alert fires. Click "Select action groups" or "Create action group." An action group can include:

- Email notifications
- SMS notifications
- Voice call
- Push notifications to the Azure mobile app
- Webhook calls (for integrating with tools like PagerDuty, Opsgenie, or OneUptime)
- Azure Functions
- Logic Apps
- Automation Runbooks
- ITSM connectors

For a basic setup, configure an email to your ops team and a webhook to your incident management platform.

### Step 6: Name and Create

Give your alert rule a descriptive name like "Service Health - All Services - Prod Regions" and click Create.

## Setting Up Alerts Using Azure CLI

If you prefer infrastructure as code or need to set this up across multiple subscriptions, the CLI approach is faster.

First, create an action group:

```bash
# Create a resource group for monitoring resources if you don't have one
az group create \
  --name rg-monitoring \
  --location eastus

# Create an action group that sends email and calls a webhook
# The short-name is limited to 12 characters and appears in SMS/notifications
az monitor action-group create \
  --resource-group rg-monitoring \
  --name ag-service-health \
  --short-name svchealth \
  --action email ops-team ops-team@yourcompany.com \
  --action webhook incident-webhook https://your-incident-tool.com/webhook/azure
```

Now create the Service Health alert rule:

```bash
# Create the service health alert
# The condition targets the ServiceHealth event category
# You can filter by specific services and regions using properties
az monitor activity-log alert create \
  --resource-group rg-monitoring \
  --name "ServiceHealthAlert-AllServices" \
  --description "Alert on all Azure Service Health events for production regions" \
  --condition category=ServiceHealth \
  --action-group ag-service-health \
  --scope "/subscriptions/<your-subscription-id>"
```

To filter the alert to specific event types, add more conditions:

```bash
# Alert only on active service issues (outages)
# The properties.incidentType field identifies the event type
az monitor activity-log alert create \
  --resource-group rg-monitoring \
  --name "ServiceHealthAlert-Incidents" \
  --description "Alert on active Azure service issues only" \
  --condition category=ServiceHealth \
  --condition properties.incidentType=Incident \
  --action-group ag-service-health \
  --scope "/subscriptions/<your-subscription-id>"
```

## Setting Up Alerts Using ARM Templates

For repeatable deployments, ARM templates are the way to go. Here is a template that creates a complete Service Health alert with an action group.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "actionGroupEmail": {
      "type": "string",
      "metadata": {
        "description": "Email address for Service Health notifications"
      }
    }
  },
  "resources": [
    {
      "type": "Microsoft.Insights/actionGroups",
      "apiVersion": "2023-01-01",
      "name": "ag-service-health",
      "location": "Global",
      "properties": {
        "groupShortName": "svchealth",
        "enabled": true,
        "emailReceivers": [
          {
            "name": "ops-team",
            "emailAddress": "[parameters('actionGroupEmail')]",
            "useCommonAlertSchema": true
          }
        ]
      }
    },
    {
      "type": "Microsoft.Insights/activityLogAlerts",
      "apiVersion": "2020-10-01",
      "name": "ServiceHealthAlert",
      "location": "Global",
      "dependsOn": [
        "[resourceId('Microsoft.Insights/actionGroups', 'ag-service-health')]"
      ],
      "properties": {
        "scopes": [
          "[subscription().id]"
        ],
        "condition": {
          "allOf": [
            {
              "field": "category",
              "equals": "ServiceHealth"
            },
            {
              "field": "properties.incidentType",
              "containsAny": [
                "Incident",
                "Maintenance",
                "Informational",
                "Security"
              ]
            }
          ]
        },
        "actions": {
          "actionGroups": [
            {
              "actionGroupId": "[resourceId('Microsoft.Insights/actionGroups', 'ag-service-health')]"
            }
          ]
        },
        "enabled": true,
        "description": "Alerts on all Service Health events"
      }
    }
  ]
}
```

Deploy this template with:

```bash
# Deploy the ARM template to your subscription
az deployment sub create \
  --location eastus \
  --template-file service-health-alert.json \
  --parameters actionGroupEmail=ops@yourcompany.com
```

## Structuring Alerts for Different Severity Levels

In practice, not all health events deserve the same response. Here is an alert structure that works well for production environments:

**Critical alerts (page the on-call team):**
- Event type: Service issues (Incident)
- Action: SMS, phone call, webhook to incident management tool

**Warning alerts (notify the team):**
- Event type: Planned maintenance
- Action: Email, Slack/Teams message

**Informational alerts (log for awareness):**
- Event types: Health advisories, Security advisories
- Action: Email to distribution list, log to a monitoring dashboard

This way your team gets woken up for actual outages but gets a calm email about upcoming maintenance.

## Testing Your Alerts

Unfortunately, you cannot trigger a fake Service Health event to test your alert. But you can verify the action group works by using the test functionality:

1. Go to Azure Monitor, then Action Groups
2. Select your action group
3. Click "Test action group" at the top
4. Choose "Service Health" as the sample type
5. Click Test

This sends a test notification through all configured actions so you can verify emails arrive, webhooks fire, and SMS messages get delivered.

## Common Mistakes to Avoid

**Not scoping to your actual regions.** If you select all regions, you will get noise from regions you do not use. Only select regions where you have deployed resources.

**Using a single action group for everything.** Different event types should trigger different responses. Use separate action groups for incidents versus advisories.

**Forgetting to include all subscriptions.** If you have multiple subscriptions, each one needs its own alert rule (or use management group scope). A common gap is setting up alerts on your production subscription but forgetting dev/staging.

**Not enabling the Common Alert Schema.** When configuring your action group, enable the Common Alert Schema. This standardizes the JSON payload sent to webhooks, making it easier to parse in downstream tools.

**Ignoring planned maintenance alerts.** Planned maintenance can cause reboots and brief downtime. Knowing about it in advance lets you prepare your workloads or shift traffic.

## Integrating with Third-Party Incident Management

If you use an incident management platform like OneUptime, PagerDuty, or Opsgenie, the webhook action type in action groups is your integration point. Each platform provides a specific webhook URL you can add as an action.

The webhook payload from a Service Health alert includes details like the impacted services, regions, current status, and communication updates. Your incident management platform can parse this to automatically create incidents, assign them to the right team, and track resolution.

## Wrapping Up

Setting up Azure Service Health alerts is one of those tasks that takes 15 minutes and pays for itself the first time an outage hits. The key is to configure alerts before you need them, scope them to the services and regions you actually use, and route different event types to appropriate response channels. Whether you use the portal, CLI, or ARM templates, the result is the same: your team learns about Azure problems from Azure, not from angry users.

# How to Configure Azure Monitor Alerts for Proactive Issue Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Monitor, Alerts, Monitoring, Observability, Metrics, Log Analytics

Description: Set up Azure Monitor alerts for proactive issue detection with practical examples covering metric alerts, log alerts, and action groups for notification.

---

Monitoring without alerts is just watching. You can have the most comprehensive dashboards in the world, but if nobody is looking at them when something breaks at 3 AM, they are not helping. Azure Monitor alerts let you define conditions that trigger notifications automatically, so your team knows about problems before users start complaining.

This post covers how to set up effective alerts that catch real issues without drowning you in noise.

## Alert Types in Azure Monitor

Azure Monitor supports several alert types, each suited for different scenarios:

- **Metric alerts**: Evaluate a metric value against a threshold at regular intervals. Best for infrastructure metrics like CPU, memory, response time.
- **Log alerts**: Run a KQL query against Log Analytics and alert based on the results. Best for complex conditions that combine multiple data sources.
- **Activity log alerts**: Trigger on Azure control plane events like resource creation, deletion, or configuration changes.
- **Service health alerts**: Notify you about Azure service incidents, planned maintenance, and health advisories.
- **Smart detection alerts**: Application Insights anomaly detection that automatically identifies unusual patterns.

## Step 1: Set Up Action Groups

Before creating alerts, define what happens when an alert fires. Action groups specify the notification and automation targets.

```bash
# Create an action group that sends email and posts to a webhook
az monitor action-group create \
  --resource-group monitoring-rg \
  --name ops-team-alerts \
  --short-name ops-team \
  --action email ops-lead ops-lead@company.com \
  --action email on-call on-call@company.com \
  --action webhook pagerduty https://events.pagerduty.com/integration/<key>/enqueue
```

You can also add SMS, voice call, Azure Function, Logic App, or ITSM actions to an action group. For critical alerts, use at least two different notification channels (e.g., email plus PagerDuty) in case one fails.

```bash
# Add an SMS action to the group
az monitor action-group update \
  --resource-group monitoring-rg \
  --name ops-team-alerts \
  --add-action sms on-call-sms 1 5551234567
```

## Step 2: Create Essential Metric Alerts

Here are the metric alerts every Azure environment should have.

### VM CPU Alert

```bash
# Alert when VM CPU exceeds 90% for 5 minutes
az monitor metrics alert create \
  --resource-group monitoring-rg \
  --name high-cpu-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/prod-vm" \
  --condition "avg Percentage CPU > 90" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --severity 2 \
  --action "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts" \
  --description "VM CPU usage exceeded 90% for 5 minutes"
```

### App Service Response Time Alert

```bash
# Alert when average response time exceeds 3 seconds
az monitor metrics alert create \
  --resource-group monitoring-rg \
  --name slow-response-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/prod-rg/providers/Microsoft.Web/sites/my-web-app" \
  --condition "avg HttpResponseTime > 3" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --severity 2 \
  --action "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts"
```

### App Service HTTP 5xx Alert

```bash
# Alert on any server errors
az monitor metrics alert create \
  --resource-group monitoring-rg \
  --name server-error-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/prod-rg/providers/Microsoft.Web/sites/my-web-app" \
  --condition "total Http5xx > 10" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --severity 1 \
  --action "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts"
```

### SQL Database DTU Alert

```bash
# Alert when database DTU consumption exceeds 80%
az monitor metrics alert create \
  --resource-group monitoring-rg \
  --name high-dtu-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/prod-rg/providers/Microsoft.Sql/servers/my-server/databases/my-db" \
  --condition "avg dtu_consumption_percent > 80" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --severity 2 \
  --action "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts"
```

### Storage Account Availability Alert

```bash
# Alert when storage availability drops below 99.9%
az monitor metrics alert create \
  --resource-group monitoring-rg \
  --name storage-availability-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/prod-rg/providers/Microsoft.Storage/storageAccounts/mystore" \
  --condition "avg Availability < 99.9" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --severity 1 \
  --action "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts"
```

## Step 3: Create Log-Based Alerts

Log alerts are more flexible than metric alerts because they can query multiple tables, perform aggregations, and use complex logic.

### Application Exceptions Alert

```bash
# Alert when exception count exceeds threshold
az monitor scheduled-query create \
  --resource-group monitoring-rg \
  --name app-exceptions-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/prod-rg/providers/Microsoft.Insights/components/my-app-insights" \
  --condition-query "exceptions | where timestamp > ago(5m) | summarize count()" \
  --condition "count > 50" \
  --severity 2 \
  --evaluation-frequency PT5M \
  --window-size PT5M \
  --action "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts"
```

### Failed Login Attempts Alert

Create a log alert that detects multiple failed sign-in attempts, which could indicate a brute force attack.

```kql
// KQL query for the log alert
SigninLogs
| where ResultType != "0"  // Non-zero means failure
| where TimeGenerated > ago(15m)
| summarize FailedAttempts = count() by UserPrincipalName, IPAddress
| where FailedAttempts > 10
```

### Custom Application Health Alert

```kql
// Alert when a critical background job has not run in the expected time window
customEvents
| where name == "BackgroundJobCompleted"
| where timestamp > ago(1h)
| summarize LastRun = max(timestamp)
| where LastRun < ago(30m)
```

## Step 4: Create Activity Log Alerts

Activity log alerts catch administrative changes that could indicate problems or security issues.

```bash
# Alert when a resource group is deleted
az monitor activity-log alert create \
  --resource-group monitoring-rg \
  --name rg-deletion-alert \
  --scope "/subscriptions/<sub-id>" \
  --condition category=Administrative and operationName="Microsoft.Resources/subscriptions/resourceGroups/delete" \
  --action-group "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts"
```

```bash
# Alert on NSG rule changes (potential security impact)
az monitor activity-log alert create \
  --resource-group monitoring-rg \
  --name nsg-change-alert \
  --scope "/subscriptions/<sub-id>" \
  --condition category=Administrative and operationName="Microsoft.Network/networkSecurityGroups/securityRules/write" \
  --action-group "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts"
```

## Step 5: Set Up Service Health Alerts

These are often overlooked but critical. When Azure has an outage in your region, you want to know immediately.

```bash
# Alert on service health incidents for your region and services
az monitor activity-log alert create \
  --resource-group monitoring-rg \
  --name service-health-alert \
  --scope "/subscriptions/<sub-id>" \
  --condition category=ServiceHealth and properties.incidentType=Incident \
  --action-group "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts"
```

## Avoiding Alert Fatigue

The biggest problem with alerting is not too few alerts but too many. Alert fatigue makes teams ignore notifications, which defeats the purpose. Follow these principles:

**Set appropriate thresholds.** Do not alert on 50% CPU usage. Alert on 90% sustained for 5+ minutes. The alert should indicate something that needs action.

**Use severity levels consistently:**
- Severity 0 (Critical): Immediate response needed, service is down
- Severity 1 (Error): Urgent attention, service is degraded
- Severity 2 (Warning): Needs investigation within hours
- Severity 3 (Informational): Review during business hours
- Severity 4 (Verbose): For tracking and audit

**Use dynamic thresholds** for metrics that have predictable patterns. Azure Monitor can learn the normal behavior of a metric and alert only on anomalies.

```bash
# Create a metric alert with dynamic thresholds
az monitor metrics alert create \
  --resource-group monitoring-rg \
  --name dynamic-cpu-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/prod-vm" \
  --condition "avg Percentage CPU > dynamic medium 4 of 4 since 2026-01-01T00:00:00Z" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --action "/subscriptions/<sub-id>/resourceGroups/monitoring-rg/providers/Microsoft.Insights/actionGroups/ops-team-alerts"
```

**Suppress duplicate alerts.** Configure the auto-resolve and frequency settings so you do not get the same alert every minute during an ongoing incident.

## Testing Your Alerts

Alerts are useless if they do not work when you need them. Test regularly.

```bash
# Test an action group to verify notifications are delivered
az monitor action-group test-notifications create \
  --resource-group monitoring-rg \
  --action-group-name ops-team-alerts \
  --alert-type metric \
  --notifications "[{\"notificationType\":\"Email\",\"emailAddress\":\"ops-lead@company.com\"}]"
```

Also run periodic fire drills. Intentionally trigger alerts by, for example, running a CPU stress test on a non-production VM, and verify that the right people receive notifications through the right channels.

## Organizing Alerts with Alert Processing Rules

Alert processing rules (formerly action rules) let you modify alert behavior without changing the alerts themselves. Use them for:

- Suppressing alerts during maintenance windows
- Routing alerts to different teams based on resource tags
- Adding additional action groups to alerts matching certain criteria

```bash
# Suppress all alerts for a resource group during maintenance
az monitor alert-processing-rule create \
  --resource-group monitoring-rg \
  --name maintenance-suppression \
  --scopes "/subscriptions/<sub-id>/resourceGroups/prod-rg" \
  --rule-type RemoveAllActionGroups \
  --schedule-start-datetime "2026-02-20T00:00:00" \
  --schedule-end-datetime "2026-02-20T06:00:00" \
  --schedule-recurrence-type Once \
  --schedule-time-zone "Eastern Standard Time"
```

Good alerting is a continuous process. Start with a small set of high-value alerts, tune thresholds based on real incidents, remove alerts that never result in action, and add new ones as you discover gaps. The goal is a system where every alert notification leads to either an action or a threshold adjustment.

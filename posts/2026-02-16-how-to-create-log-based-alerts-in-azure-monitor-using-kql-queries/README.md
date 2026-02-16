# How to Create Log-Based Alerts in Azure Monitor Using KQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Monitor, KQL, Log Alerts, Azure Cloud, Observability, Log Analytics, Alerting

Description: Step-by-step guide to creating log-based alert rules in Azure Monitor using KQL queries for proactive monitoring and incident detection.

---

Metric alerts in Azure Monitor are great for straightforward threshold checks - things like CPU above 90% or disk space below 10%. But when you need to alert on patterns in your log data, like a sudden spike in 500 errors, failed authentication attempts, or a specific error message showing up in your application logs, you need log-based alerts powered by KQL queries.

Log alerts run a KQL query against your Log Analytics workspace on a schedule. If the query returns results that match your condition (a row count threshold, a numeric value crossing a boundary, etc.), the alert fires. This gives you enormous flexibility because anything you can query, you can alert on.

## How Log Alert Rules Work

A log alert rule has four main components:

1. **Scope**: The Log Analytics workspace or Application Insights resource to query
2. **Condition**: A KQL query plus a threshold (e.g., "fire if the query returns more than 5 rows")
3. **Evaluation frequency**: How often the query runs (every 5 minutes, every 15 minutes, etc.)
4. **Action group**: What happens when the alert fires (email, SMS, webhook, runbook, etc.)

The query runs on the schedule you define. Azure evaluates the results against your threshold condition. If the condition is met, it triggers the action group.

## Step 1: Write and Test Your KQL Query

Always start in the Log Analytics query editor. Navigate to your Log Analytics workspace in the Azure Portal and click Logs. Write your query and make sure it returns the data you expect before turning it into an alert.

Here is an example query that detects a high rate of HTTP 500 errors in the last 15 minutes:

```kql
// Count HTTP 500 errors in the last 15 minutes, grouped by request URL
AppRequests
| where TimeGenerated > ago(15m)
| where ResultCode == "500"
| summarize ErrorCount = count() by Url = Name
| where ErrorCount > 10
| order by ErrorCount desc
```

Run this query and verify it works. If you do not have Application Insights data, adjust the table name and columns to match your log data.

Another common use case is alerting on failed sign-ins:

```kql
// Detect accounts with multiple failed sign-in attempts
SigninLogs
| where TimeGenerated > ago(30m)
| where ResultType != "0"  // Non-zero means failure
| summarize FailureCount = count() by UserPrincipalName, IPAddress
| where FailureCount > 5
| project UserPrincipalName, IPAddress, FailureCount
```

## Step 2: Create the Alert Rule in the Portal

Once your query is working:

1. In the Log Analytics query editor, click "New alert rule" in the top toolbar
2. This pre-populates the alert rule creation form with your query and workspace

Under the **Condition** tab:

- **Measure**: Choose "Table rows" if you want to alert when the query returns any results, or "Metric measurement" if your query produces a numeric column you want to threshold on
- **Aggregation type**: For table rows, this is typically "Count". For metric measurement, choose avg, min, max, sum, etc.
- **Threshold value**: Set the number that triggers the alert (e.g., greater than 0 for "any results")
- **Frequency of evaluation**: How often the query runs. 5 minutes is common for critical alerts. Use 15 or 30 minutes for less urgent checks.
- **Lookback period**: The time window the query covers. This should match the `ago()` value in your query.

## Step 3: Create the Alert Rule Using Azure CLI

If you prefer infrastructure as code or need to create many alert rules, use the CLI.

```bash
# Create a log-based alert rule that fires when HTTP 500 errors exceed threshold
az monitor scheduled-query create \
  --name "High-500-Error-Rate" \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --condition "count 'AppRequests | where TimeGenerated > ago(15m) | where ResultCode == \"500\"' > 10" \
  --condition-query "AppRequests | where TimeGenerated > ago(15m) | where ResultCode == '500' | summarize AggregatedValue = count()" \
  --evaluation-frequency 5m \
  --window-size 15m \
  --severity 2 \
  --action-groups "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Insights/actionGroups/myActionGroup"
```

## Step 4: Configure Action Groups

Action groups define what happens when an alert fires. You can reuse the same action group across multiple alert rules.

Common action types include:

- **Email/SMS**: Notify on-call engineers directly
- **Webhook**: POST alert data to a custom endpoint, Slack, or PagerDuty
- **Azure Function**: Run serverless code for automated remediation
- **Logic App**: Trigger a workflow for complex response procedures
- **Runbook**: Execute an Azure Automation runbook

Create an action group with email and webhook notifications:

```bash
# Create an action group with email and webhook actions
az monitor action-group create \
  --resource-group myResourceGroup \
  --name CriticalAlerts \
  --short-name CritAlert \
  --action email admin-email admin@company.com \
  --action webhook slack-hook https://hooks.slack.com/services/T00/B00/xxxx
```

## Step 5: Use Dimensions for Granular Alerting

One powerful feature of log alerts is the ability to split on dimensions. Instead of getting a single alert that says "there are errors somewhere," you can get separate alerts per resource, per user, or per endpoint.

In the alert condition, set the "Dimension" to split by a column from your query results:

```kql
// Query that produces per-service error counts for dimensional alerting
AppRequests
| where TimeGenerated > ago(15m)
| where ResultCode startswith "5"
| summarize ErrorCount = count() by ServiceName = cloud_RoleName
```

When you configure the alert rule, set the dimension to `ServiceName`. Now if both "payment-service" and "order-service" breach the threshold, you get two separate alerts - each with the service name in the alert payload.

## Step 6: Handle Alert Fatigue

Alert fatigue is real, and log alerts can be noisy if you are not careful. Here are some practical strategies:

**Auto-resolve**: Configure the alert to auto-resolve when the condition is no longer met. This prevents stale alerts from cluttering your dashboard.

**Mute actions**: Use action rule suppression during maintenance windows. Create an action rule that suppresses alerts for a resource group during planned downtime.

**Aggregation granularity**: Set the evaluation frequency to match the urgency. Not every alert needs to run every 5 minutes. A daily cost anomaly check can run once per hour.

**Threshold tuning**: Start with higher thresholds and tighten them over time. It is better to miss a few early alerts while you calibrate than to burn out your team with false positives.

## Step 7: Monitor Alert Rule Health

Sometimes alert rules themselves fail - maybe the query has a syntax error after a schema change, or the Log Analytics workspace is throttled. Check the health of your alert rules by navigating to Azure Monitor > Alerts > Alert rules and looking at the status column.

You can also query the alert rule execution status:

```kql
// Check for alert rule execution failures
_LogOperation
| where Category == "Alert"
| where Level == "Error"
| project TimeGenerated, Detail, _ResourceId
| order by TimeGenerated desc
```

## Practical Examples

Here are a few more alert queries that I have found useful in production:

**Detect sudden drop in log volume** (possible agent failure):

```kql
// Alert when a machine stops sending heartbeats
Heartbeat
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| where LastHeartbeat < ago(10m)
| project Computer, LastHeartbeat, MinutesSilent = datetime_diff('minute', now(), LastHeartbeat)
```

**Alert on slow database queries**:

```kql
// Find database calls taking longer than 5 seconds
AppDependencies
| where TimeGenerated > ago(15m)
| where DependencyType == "SQL"
| where DurationMs > 5000
| summarize SlowQueryCount = count(), AvgDuration = avg(DurationMs) by Target
| where SlowQueryCount > 3
```

**Detect resource deletion events**:

```kql
// Alert when resources are deleted from a resource group
AzureActivity
| where TimeGenerated > ago(30m)
| where OperationNameValue endswith "DELETE"
| where ActivityStatusValue == "Success"
| project TimeGenerated, Caller, ResourceGroup, Resource = _ResourceId
```

## Cost Considerations

Log alert rules are billed per evaluation. A rule that runs every 5 minutes costs more than one that runs every 15 minutes. The KQL query itself also consumes Log Analytics query units.

To keep costs reasonable:
- Use the longest evaluation frequency that still meets your response time requirements
- Keep your KQL queries efficient - avoid scanning large time ranges unnecessarily
- Use metric alerts instead of log alerts when a simple threshold on a standard metric would work

## Summary

Log-based alerts in Azure Monitor give you the flexibility to alert on virtually any pattern in your telemetry data. The key is writing clean KQL queries, testing them thoroughly before creating alert rules, and putting thought into your thresholds and action groups to avoid alert fatigue. Start with a few critical alerts, measure their effectiveness, and expand from there.

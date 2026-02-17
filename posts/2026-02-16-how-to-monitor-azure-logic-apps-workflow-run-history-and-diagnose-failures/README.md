# How to Monitor Azure Logic Apps Workflow Run History and Diagnose Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Logic Apps, Workflow Monitoring, Diagnostics, Azure Monitor, Troubleshooting, Integration, Automation

Description: Practical guide to monitoring Azure Logic Apps workflow runs, diagnosing failures, and setting up alerting for reliable workflow automation.

---

Azure Logic Apps is a powerful integration platform, but workflows fail. An API returns an unexpected response, a connector times out, a condition evaluates incorrectly, a throttle limit is hit. When a business-critical workflow fails - say, an order processing flow or an invoice generation pipeline - you need to find the root cause quickly.

Logic Apps provides detailed run history that shows exactly what happened at each step of a workflow. Combined with Azure Monitor diagnostics, you can build comprehensive monitoring that catches failures early and gives you the context to fix them fast.

## Understanding Workflow Run States

Every Logic Apps workflow run has a status:

- **Succeeded**: All actions completed successfully
- **Failed**: One or more actions failed and the workflow did not recover
- **Cancelled**: The workflow was cancelled (manually or by a timeout)
- **Running**: The workflow is currently executing
- **Waiting**: The workflow is paused, waiting for an approval or callback
- **Skipped**: The workflow was skipped due to a trigger condition

Each action within a run also has its own status, so you can see exactly which step failed even when the overall workflow succeeds (because of error handling).

## Step 1: View Run History in the Portal

Navigate to your Logic App > Overview. The runs history section shows recent executions with their status, start time, and duration.

Click on any run to see the detailed execution view. This shows:

- Each action as a card in the workflow
- Green checkmarks for successful actions
- Red X marks for failed actions
- Gray marks for skipped actions
- The duration of each action
- Inputs and outputs of each action (click the action to expand)

The inputs and outputs are extremely valuable. For a failed HTTP action, you can see the exact request sent and the response received. For a condition, you can see the values that were evaluated.

## Step 2: Enable Diagnostic Logging

For programmatic monitoring and alerting, enable diagnostic logging to send Logic Apps data to Log Analytics.

```bash
# Enable diagnostic settings for a Logic App
az monitor diagnostic-settings create \
  --name logicapp-diagnostics \
  --resource "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Logic/workflows/myLogicApp" \
  --workspace "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[
    {"category": "WorkflowRuntime", "enabled": true},
    {"category": "IntegrationAccountTrackingEvents", "enabled": true}
  ]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

Once enabled, Logic Apps sends workflow run events, action events, and trigger events to your Log Analytics workspace.

## Step 3: Query Run History with KQL

With diagnostic logs flowing to Log Analytics, you can write powerful queries:

**Find all failed workflow runs**:

```kql
// List recent failed workflow runs with failure details
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC"
| where Category == "WorkflowRuntime"
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted"
| where status_s == "Failed"
| project
    TimeGenerated,
    WorkflowName = resource_workflowName_s,
    RunId = resource_runId_s,
    ErrorCode = code_s,
    ErrorMessage = error_message_s
| order by TimeGenerated desc
```

**Find the action that caused a workflow failure**:

```kql
// Identify the specific action that failed in each workflow run
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC"
| where Category == "WorkflowRuntime"
| where OperationName == "Microsoft.Logic/workflows/workflowActionCompleted"
| where status_s == "Failed"
| project
    TimeGenerated,
    WorkflowName = resource_workflowName_s,
    RunId = resource_runId_s,
    ActionName = resource_actionName_s,
    ErrorCode = code_s,
    ErrorMessage = error_message_s
| order by TimeGenerated desc
```

**Analyze failure patterns over time**:

```kql
// Failure rate by workflow over the past 7 days
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC"
| where Category == "WorkflowRuntime"
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted"
| where TimeGenerated > ago(7d)
| summarize
    TotalRuns = count(),
    FailedRuns = countif(status_s == "Failed"),
    SucceededRuns = countif(status_s == "Succeeded")
    by resource_workflowName_s, bin(TimeGenerated, 1d)
| extend FailureRate = round(100.0 * FailedRuns / TotalRuns, 1)
| project TimeGenerated, WorkflowName = resource_workflowName_s,
          TotalRuns, FailedRuns, FailureRate
| order by FailureRate desc
```

## Step 4: Monitor Trigger Health

Triggers are where problems often start. A trigger failure means the workflow never even runs.

```kql
// Monitor trigger failures
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC"
| where Category == "WorkflowRuntime"
| where OperationName == "Microsoft.Logic/workflows/workflowTriggerCompleted"
| where status_s == "Failed"
| project
    TimeGenerated,
    WorkflowName = resource_workflowName_s,
    TriggerName = resource_triggerName_s,
    ErrorCode = code_s,
    ErrorMessage = error_message_s
| order by TimeGenerated desc
```

Common trigger failures:

- **HTTP triggers**: The calling system sends malformed data or the wrong content type
- **Recurrence triggers**: These rarely fail, but the workflow itself might fail immediately after triggering
- **Service Bus triggers**: Connection issues, expired tokens, or queue/topic permissions
- **Polling triggers**: The target system is unreachable or returns errors

## Step 5: Set Up Failure Alerts

Create alerts that notify you when workflows fail:

```kql
// Alert query: any workflow failure in the last 15 minutes
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC"
| where Category == "WorkflowRuntime"
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted"
| where status_s == "Failed"
| where TimeGenerated > ago(15m)
| project TimeGenerated, WorkflowName = resource_workflowName_s,
          ErrorMessage = error_message_s
```

You can also use metric alerts for faster detection:

```bash
# Create a metric alert for Logic App run failures
az monitor metrics alert create \
  --name "logicapp-failure-alert" \
  --resource-group myRG \
  --scopes "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Logic/workflows/myLogicApp" \
  --condition "total RunsFailed > 0" \
  --window-size 5m \
  --evaluation-frequency 5m \
  --severity 2 \
  --action-group "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Insights/actionGroups/OpsTeam"
```

## Step 6: Track Workflow Duration

Slow workflows can be as problematic as failing ones. Monitor execution duration:

```kql
// Track workflow execution duration trends
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC"
| where Category == "WorkflowRuntime"
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted"
| where status_s == "Succeeded"
| extend DurationSeconds = toint(durationInMilliseconds_d / 1000)
| summarize
    AvgDuration = avg(DurationSeconds),
    P95Duration = percentile(DurationSeconds, 95),
    MaxDuration = max(DurationSeconds),
    RunCount = count()
    by resource_workflowName_s, bin(TimeGenerated, 1h)
| order by P95Duration desc
```

Set a duration alert for workflows that should complete within a certain time:

```kql
// Alert when a workflow takes more than 5 minutes
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC"
| where OperationName == "Microsoft.Logic/workflows/workflowRunCompleted"
| where durationInMilliseconds_d > 300000
| project TimeGenerated, WorkflowName = resource_workflowName_s,
          DurationMinutes = round(durationInMilliseconds_d / 60000.0, 1)
```

## Step 7: Diagnose Common Failure Patterns

**Connector throttling**: Many connectors have rate limits. When you hit them, actions fail with a 429 status code.

```kql
// Detect throttling events across all Logic Apps
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC"
| where Category == "WorkflowRuntime"
| where code_s == "429" or error_message_s contains "throttl"
| summarize ThrottleCount = count() by resource_workflowName_s, resource_actionName_s
| order by ThrottleCount desc
```

Fix: Add retry policies with exponential backoff, reduce concurrency, or implement batching.

**Timeout failures**: Actions that take too long will time out.

```kql
// Find actions that are timing out
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.LOGIC"
| where status_s == "Failed"
| where error_message_s contains "timeout" or code_s == "GatewayTimeout"
| project TimeGenerated, resource_workflowName_s, resource_actionName_s, error_message_s
```

Fix: Increase the timeout in the action settings, optimize the downstream service, or use async patterns with webhooks.

**Data format issues**: Actions fail because the data does not match the expected schema.

Fix: Add data validation actions before processing. Use the Parse JSON action with a schema to validate incoming data.

## Step 8: Build a Monitoring Dashboard

Create an Azure Workbook that combines all these queries into a single monitoring view:

1. Go to Azure Monitor > Workbooks
2. Click New
3. Add a query for overall success/failure rate
4. Add a query for top failing workflows
5. Add a query for duration trends
6. Add a query for throttling events
7. Save and share with your team

Key sections for the dashboard:

- **Summary tiles**: Total runs, success rate, average duration
- **Failure timeline**: Chart showing failures over time
- **Top failures table**: Which workflows fail most and why
- **Duration trend**: Line chart showing P95 duration by workflow
- **Trigger health**: Status of all triggers

## Resubmitting Failed Runs

When a workflow fails due to a transient issue (network blip, temporary service outage), you can resubmit the run:

1. Go to the failed run in the portal
2. Click "Resubmit" at the top
3. The workflow re-executes from the trigger with the original inputs

For bulk resubmission, use the REST API:

```bash
# Resubmit a failed workflow run
az rest --method POST \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.Logic/workflows/myLogicApp/triggers/manual/histories/<run-id>/resubmit?api-version=2016-06-01"
```

## Summary

Monitoring Logic Apps effectively requires a combination of the built-in run history for detailed debugging and Log Analytics for pattern analysis and alerting. Enable diagnostic logging, write KQL queries for the failure patterns that matter to your business, set up alerts for critical workflows, and build a dashboard for ongoing visibility. The run history shows you exactly what went wrong in each step, while the aggregate analysis helps you spot systemic issues before they become outages.

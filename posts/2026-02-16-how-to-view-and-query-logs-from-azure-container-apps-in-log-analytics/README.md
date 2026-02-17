# How to View and Query Logs from Azure Container Apps in Log Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Apps, Log Analytics, KQL, Monitoring, Observability, Troubleshooting

Description: A practical guide to viewing and querying Azure Container Apps logs using Log Analytics and KQL, with ready-to-use queries for common scenarios.

---

When your container app misbehaves in production, logs are your first line of investigation. Azure Container Apps sends logs to Azure Monitor Log Analytics, which stores and indexes them for querying. The query language is KQL (Kusto Query Language), and once you get comfortable with it, you can diagnose issues in seconds that would take hours to find by scrolling through raw log output. This post covers how to set up log collection, write useful queries, and build alerts based on log patterns.

## How Logging Works in Azure Container Apps

Azure Container Apps captures two types of logs:

- **Console logs (ContainerAppConsoleLogs_CL):** Everything your application writes to stdout and stderr. This includes application log messages, error stack traces, and debug output.
- **System logs (ContainerAppSystemLogs_CL):** Platform-level events like container starts, stops, health probe results, scaling events, and image pull status.

Both are sent to a Log Analytics workspace that you configure when creating the Container Apps environment.

## Step 1: Verify Log Analytics Configuration

Check that your Container Apps environment is connected to a Log Analytics workspace.

```bash
# View the environment's logging configuration
az containerapp env show \
  --name my-env \
  --resource-group my-rg \
  --query "properties.appLogsConfiguration"
```

If logging is not configured, you can update the environment.

```bash
# Get the Log Analytics workspace details
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --workspace-name my-workspace \
  --resource-group my-rg \
  --query "customerId" -o tsv)

WORKSPACE_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --workspace-name my-workspace \
  --resource-group my-rg \
  --query "primarySharedKey" -o tsv)

# Note: Logging is typically configured during environment creation
# For new environments:
az containerapp env create \
  --name my-env \
  --resource-group my-rg \
  --location eastus \
  --logs-workspace-id $WORKSPACE_ID \
  --logs-workspace-key $WORKSPACE_KEY
```

## Step 2: View Logs with the CLI

For quick troubleshooting, the CLI provides streaming log output.

```bash
# Stream console logs in real time
az containerapp logs show \
  --name my-api \
  --resource-group my-rg \
  --type console \
  --follow

# View system logs
az containerapp logs show \
  --name my-api \
  --resource-group my-rg \
  --type system

# View logs from a specific revision
az containerapp logs show \
  --name my-api \
  --resource-group my-rg \
  --revision my-api--v2 \
  --type console
```

## Step 3: Query Console Logs with KQL

The real power comes from KQL queries in Log Analytics. Open the Azure Portal, navigate to your Log Analytics workspace, and run queries.

Here are the queries I use most frequently.

**View recent application logs:**

```kusto
// Show the most recent 100 log entries for a specific app
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "my-api"
| where TimeGenerated > ago(1h)
| project TimeGenerated, Log_s, RevisionName_s, ContainerName_s
| order by TimeGenerated desc
| take 100
```

**Search for errors:**

```kusto
// Find all error messages across all apps in the last 24 hours
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| where Log_s contains "error" or Log_s contains "Error" or Log_s contains "ERROR"
| project TimeGenerated, ContainerAppName_s, Log_s
| order by TimeGenerated desc
```

**Count errors by app:**

```kusto
// Which apps are throwing the most errors?
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(24h)
| where Log_s contains "error" or Log_s contains "exception"
| summarize ErrorCount = count() by ContainerAppName_s
| order by ErrorCount desc
```

## Step 4: Query System Logs

System logs tell you what the platform is doing with your containers.

**Check container lifecycle events:**

```kusto
// View container start, stop, and restart events
ContainerAppSystemLogs_CL
| where ContainerAppName_s == "my-api"
| where TimeGenerated > ago(4h)
| project TimeGenerated, EventSource_s, Reason_s, Type_s, Log_s
| order by TimeGenerated desc
```

**Find health probe failures:**

```kusto
// Identify health probe failures
ContainerAppSystemLogs_CL
| where ContainerAppName_s == "my-api"
| where Log_s contains "probe" and Log_s contains "fail"
| project TimeGenerated, Log_s, RevisionName_s
| order by TimeGenerated desc
```

**Track scaling events:**

```kusto
// Monitor scaling up and down events
ContainerAppSystemLogs_CL
| where TimeGenerated > ago(12h)
| where Log_s contains "scale" or Log_s contains "replica"
| project TimeGenerated, ContainerAppName_s, Log_s
| order by TimeGenerated desc
```

## Step 5: Advanced KQL Queries

KQL supports aggregations, time-series analysis, and joins that are very useful for operational visibility.

**Error rate over time:**

```kusto
// Plot error rate per 5-minute window
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "my-api"
| where TimeGenerated > ago(6h)
| summarize
    TotalLogs = count(),
    Errors = countif(Log_s contains "error" or Log_s contains "exception")
    by bin(TimeGenerated, 5m)
| extend ErrorRate = todouble(Errors) / todouble(TotalLogs) * 100
| project TimeGenerated, ErrorRate
| render timechart
```

**Unique error messages:**

```kusto
// Group and count distinct error messages
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "my-api"
| where TimeGenerated > ago(24h)
| where Log_s contains "error" or Log_s contains "exception"
| extend ErrorMessage = extract("(Error|Exception):?\\s*(.*)", 2, Log_s)
| summarize Count = count(), LastSeen = max(TimeGenerated) by ErrorMessage
| order by Count desc
| take 20
```

**Response time analysis (if your app logs response times):**

```kusto
// Parse response times from structured log output
// Assumes log format: "GET /api/orders 200 45ms"
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "my-api"
| where Log_s matches regex "\\d+ms$"
| extend ResponseTime = toint(extract("(\\d+)ms", 1, Log_s))
| summarize
    p50 = percentile(ResponseTime, 50),
    p95 = percentile(ResponseTime, 95),
    p99 = percentile(ResponseTime, 99),
    avg = avg(ResponseTime)
    by bin(TimeGenerated, 5m)
| render timechart
```

## Step 6: Create Log-Based Alerts

Set up alerts that notify you when specific log patterns appear.

```bash
# Create an alert rule that fires when error count exceeds threshold
az monitor scheduled-query create \
  --name "high-error-rate" \
  --resource-group my-rg \
  --scopes "/subscriptions/{sub-id}/resourceGroups/my-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace" \
  --condition "count > 50" \
  --condition-query "ContainerAppConsoleLogs_CL | where Log_s contains 'error' | where TimeGenerated > ago(5m)" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 2 \
  --action-groups "/subscriptions/{sub-id}/resourceGroups/my-rg/providers/Microsoft.Insights/actionGroups/my-action-group"
```

## Step 7: Export Logs for Long-Term Storage

Log Analytics has a retention limit (default 30 days, configurable up to 730 days). For compliance or analysis, export logs to cheaper storage.

```bash
# Create a data export rule to Azure Storage
az monitor log-analytics workspace data-export create \
  --resource-group my-rg \
  --workspace-name my-workspace \
  --name export-container-logs \
  --table-names ContainerAppConsoleLogs_CL ContainerAppSystemLogs_CL \
  --destination "/subscriptions/{sub-id}/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/mylogstorage"
```

## Structured Logging for Better Queries

If you log in JSON format, KQL can parse the structured fields for much more powerful queries.

```javascript
// Use structured logging in your application
const pino = require('pino');
const logger = pino({ level: 'info' });

// Structured log entries are easier to query in KQL
logger.info({
  event: 'order_created',
  orderId: '12345',
  customerId: 'cust-789',
  amount: 99.99,
  duration_ms: 45
}, 'Order created successfully');
```

Then query the structured fields in KQL.

```kusto
// Parse JSON log entries and query specific fields
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "my-api"
| where Log_s contains "order_created"
| extend ParsedLog = parse_json(Log_s)
| extend OrderId = tostring(ParsedLog.orderId)
| extend Amount = todouble(ParsedLog.amount)
| extend Duration = toint(ParsedLog.duration_ms)
| summarize AvgDuration = avg(Duration), TotalOrders = count() by bin(TimeGenerated, 1h)
| render timechart
```

## Tips for Effective Log Querying

1. **Always filter by time first.** KQL processes data chronologically, and a time filter dramatically reduces the data scanned.

2. **Use `contains` for case-insensitive substring search** and `has` for whole-word matching. `has` is faster because it uses the index.

3. **Use `project` to select only the columns you need.** This makes results easier to read and reduces data transfer.

4. **Save frequently used queries.** The Log Analytics query editor lets you save and organize queries.

5. **Use `render timechart` for visual analysis.** Time-based charts make it easy to spot trends and anomalies.

## Summary

Log Analytics gives you a powerful way to investigate issues, monitor trends, and set up alerts for your Azure Container Apps. The combination of console logs (application output) and system logs (platform events) covers most debugging scenarios. Learn KQL - even the basics like filtering, counting, and time-series aggregation will save you hours of troubleshooting. For production workloads, use structured logging in your applications to make KQL queries more precise and reliable.

# How to Enable and Analyze Azure Storage Diagnostic Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Storage, Diagnostic Logs, Monitoring, Log Analytics, Troubleshooting, Observability

Description: Step-by-step guide to enabling Azure Storage diagnostic logging and analyzing the logs to troubleshoot performance and access issues.

---

When something goes wrong with Azure Storage, your first instinct is probably to check metrics. Metrics tell you that something happened, but logs tell you exactly what happened, who did it, and when. Azure Storage diagnostic logs capture every request made to your storage account, including the caller's IP, the operation performed, authentication details, and the latency of the response. This post shows you how to turn them on and get useful information out of them.

## Classic Diagnostic Logging vs. Azure Monitor Logs

Azure Storage has two logging systems, and it is important to know the difference.

**Classic Storage Analytics Logging** writes logs to a `$logs` container within the storage account itself. This is the older approach and has some limitations, like no support for Azure Data Lake Storage Gen2 and limited querying capabilities.

**Azure Monitor diagnostic logs** send logs to a Log Analytics workspace, Event Hub, or a separate storage account. This is the modern approach and integrates with the rest of Azure's monitoring ecosystem.

For new setups, I recommend Azure Monitor diagnostic logs. They are more flexible and much easier to query with KQL (Kusto Query Language).

## Enabling Azure Monitor Diagnostic Logs

You can enable diagnostic logging through the Azure Portal, CLI, or ARM templates. Let's start with the CLI approach since it is reproducible.

```bash
# Enable diagnostic logging for blob storage
# Logs are sent to a Log Analytics workspace for querying
az monitor diagnostic-settings create \
  --name "StorageDiagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount/blobServices/default" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[
    {
      "category": "StorageRead",
      "enabled": true
    },
    {
      "category": "StorageWrite",
      "enabled": true
    },
    {
      "category": "StorageDelete",
      "enabled": true
    }
  ]' \
  --metrics '[
    {
      "category": "Transaction",
      "enabled": true
    }
  ]'
```

You need to create a diagnostic setting for each storage service you want to monitor. The command above covers blob storage. Repeat it with `/queueServices/default`, `/tableServices/default`, and `/fileServices/default` for the other services.

### Enable for All Services at Once

Here is a script that enables logging for all four storage services:

```bash
#!/bin/bash
# Enable diagnostic logging for all storage services in a storage account
# Each service needs its own diagnostic setting

ACCOUNT_NAME="mystorageaccount"
RESOURCE_GROUP="myRG"
SUBSCRIPTION_ID="your-subscription-id"
WORKSPACE_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.OperationalInsights/workspaces/myWorkspace"

SERVICES=("blobServices" "queueServices" "tableServices" "fileServices")

for SERVICE in "${SERVICES[@]}"; do
  RESOURCE_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Storage/storageAccounts/${ACCOUNT_NAME}/${SERVICE}/default"

  az monitor diagnostic-settings create \
    --name "StorageDiag-${SERVICE}" \
    --resource "${RESOURCE_ID}" \
    --workspace "${WORKSPACE_ID}" \
    --logs '[{"category":"StorageRead","enabled":true},{"category":"StorageWrite","enabled":true},{"category":"StorageDelete","enabled":true}]' \
    --metrics '[{"category":"Transaction","enabled":true}]'

  echo "Enabled diagnostics for ${SERVICE}"
done
```

## Understanding the Log Schema

Each log entry captures a wealth of information. Here are the most useful fields:

| Field | Description |
|-------|-------------|
| `TimeGenerated` | When the request was processed |
| `OperationName` | The storage operation (GetBlob, PutBlob, DeleteBlob, etc.) |
| `StatusCode` | HTTP response status code |
| `StatusText` | Human-readable status (Success, AuthorizationFailure, etc.) |
| `CallerIpAddress` | IP address of the client |
| `AuthenticationType` | How the caller authenticated (AccountKey, SAS, OAuth, Anonymous) |
| `Uri` | The full request URI |
| `DurationMs` | How long the operation took in milliseconds |
| `ServerLatencyMs` | Time the server spent processing the request |
| `UserAgentHeader` | The client's user agent string |

## Querying Logs with KQL

Once logs start flowing to your Log Analytics workspace (give it 5-10 minutes after enabling), you can query them using KQL. Here are the queries I find most useful.

### Find Failed Requests

This query surfaces all non-successful requests, which is usually where you start when troubleshooting:

```
StorageBlobLogs
| where TimeGenerated > ago(1h)
| where StatusCode >= 400
| summarize Count = count() by StatusCode, StatusText, OperationName
| order by Count desc
```

### Identify Slow Operations

Find operations that are taking longer than expected:

```
StorageBlobLogs
| where TimeGenerated > ago(24h)
| where DurationMs > 1000
| project TimeGenerated, OperationName, Uri, DurationMs, ServerLatencyMs, CallerIpAddress
| order by DurationMs desc
| take 50
```

### Track Authentication Failures

This is critical for security monitoring. See who is trying to access your storage and failing:

```
StorageBlobLogs
| where TimeGenerated > ago(7d)
| where StatusCode == 403
| summarize
    AttemptCount = count(),
    LastAttempt = max(TimeGenerated)
    by CallerIpAddress, AuthenticationType, OperationName
| order by AttemptCount desc
```

### Analyze Traffic Patterns

Understand when your storage account is busiest:

```
StorageBlobLogs
| where TimeGenerated > ago(24h)
| summarize RequestCount = count(), AvgLatencyMs = avg(DurationMs)
    by bin(TimeGenerated, 5m)
| render timechart
```

### Find the Most Accessed Blobs

Identify hot blobs that might benefit from caching or CDN:

```
StorageBlobLogs
| where TimeGenerated > ago(24h)
| where OperationName == "GetBlob"
| extend BlobPath = tostring(split(Uri, "?")[0])
| summarize ReadCount = count() by BlobPath
| order by ReadCount desc
| take 20
```

## Setting Up Alerts on Log Patterns

Beyond ad-hoc querying, you should set up alerts for patterns that indicate problems. Here is an example that alerts on a spike in authorization failures:

```bash
# Create a log-based alert for excessive auth failures
az monitor scheduled-query create \
  --name "StorageAuthFailureAlert" \
  --resource-group myRG \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --condition "count 'StorageBlobLogs | where StatusCode == 403' > 50" \
  --condition-query "StorageBlobLogs | where StatusCode == 403 | where TimeGenerated > ago(5m)" \
  --window-size 5 \
  --evaluation-frequency 5 \
  --severity 2 \
  --action-groups "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Insights/actionGroups/myTeam"
```

## Classic Storage Analytics Logging

If you need to use classic logging (for example, for compatibility with existing tooling), you can enable it with:

```bash
# Enable classic Storage Analytics logging for blob service
az storage logging update \
  --account-name mystorageaccount \
  --services b \
  --log rwd \
  --retention 30
```

The `--log rwd` flag enables logging for read (r), write (w), and delete (d) operations. The `--retention 30` sets a 30-day retention period.

Classic logs are stored as semicolon-delimited text files in the `$logs` container. They are harder to query than Log Analytics, but you can download and process them with tools like Azure Storage Explorer or scripts.

## Cost Considerations

Diagnostic logging is not free. The costs come from two places:

1. **Log ingestion**: Log Analytics charges per GB of data ingested. A busy storage account can generate significant log volume. For a storage account handling 10,000 requests per second, you might see several GB of logs per day.

2. **Log retention**: Log Analytics charges for data retention beyond the default period (usually 30 days for free tier).

To manage costs, consider:

- Only enable the log categories you need. If you only care about writes and deletes, skip StorageRead logs since read operations typically generate the most volume.
- Set up data collection rules to filter out routine operations before they hit Log Analytics.
- Use shorter retention periods for logs that are only needed for troubleshooting.

## Practical Tips

A few things I have learned from running diagnostic logging in production:

- **Enable logging before you need it.** It is frustrating to have an incident and discover that logging was not enabled. The cost is usually minimal for moderate-traffic accounts.
- **Correlate with metrics.** Use metrics for alerting (they are cheaper and faster) and logs for investigation. When a metric alert fires, switch to logs to understand the details.
- **Watch for log latency.** There can be a 5-15 minute delay between a storage operation and the log appearing in Log Analytics. Do not panic if you do not see logs immediately after enabling the setting.
- **Use resource-specific tables.** When configuring diagnostic settings, choose the resource-specific destination table mode. This creates dedicated tables like `StorageBlobLogs` instead of dumping everything into the generic `AzureDiagnostics` table, making queries much simpler and more performant.

Diagnostic logs are one of those things that seem like overkill until the day you need them. Getting them set up correctly takes 15 minutes and can save you hours during an incident.

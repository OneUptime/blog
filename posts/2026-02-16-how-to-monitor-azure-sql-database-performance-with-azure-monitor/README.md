# How to Monitor Azure SQL Database Performance with Azure Monitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Azure Monitor, Performance Monitoring, Metrics, Alerts, Database, Observability

Description: Learn how to use Azure Monitor to track Azure SQL Database performance metrics, set up alerts, create dashboards, and diagnose performance issues.

---

Running a database without monitoring is like driving without a dashboard. Everything seems fine until it is not, and by then you are already in trouble. Azure Monitor provides comprehensive monitoring for Azure SQL Database, giving you metrics, logs, alerts, and dashboards to keep your database healthy and catch problems before they affect users.

In this post, I will cover how to set up monitoring, which metrics matter most, how to configure alerts, and how to build dashboards that give you real-time visibility into your database performance.

## What Azure Monitor Provides for Azure SQL Database

Azure Monitor integrates natively with Azure SQL Database to provide:

- **Metrics**: Real-time performance data like CPU percentage, DTU usage, storage, and connection counts
- **Diagnostic logs**: Detailed logs of queries, errors, timeouts, and deadlocks
- **Alerts**: Automated notifications when metrics cross thresholds
- **Dashboards**: Visual displays of key metrics for at-a-glance monitoring
- **Log Analytics**: KQL-based querying of diagnostic data for deep analysis
- **Workbooks**: Interactive reports that combine metrics and logs

## Key Metrics to Monitor

Not all metrics are equally important. Here are the ones I watch closely.

### Resource Utilization

**CPU percentage**: The percentage of allocated CPU being used. Consistently above 80% means you are approaching the limit and should consider scaling up or optimizing queries.

**DTU percentage** (for DTU-based databases): A blended measure of CPU, memory, and I/O usage. This single number tells you how close you are to your tier's capacity.

**Data IO percentage**: Physical reads from storage. High values indicate queries are reading from disk instead of the buffer cache, often due to missing indexes or insufficient memory.

**Log IO percentage**: Transaction log write activity. High values indicate heavy write workloads.

### Connection Metrics

**Successful connections**: The number of successful database connections. A sudden drop could indicate a network or firewall issue.

**Failed connections**: The number of connection failures. A spike usually means a misconfigured application, firewall changes, or the database hitting its connection limit.

**Blocked by firewall**: Connections blocked by firewall rules. Non-zero values mean someone or something is trying to connect from an unauthorized IP.

### Storage Metrics

**Data space used**: How much storage your data occupies. Monitor this against your maximum size to avoid hitting the limit.

**Data space allocated**: The physical space allocated to data files. This can be larger than the space used due to fragmentation.

**Tempdb size**: Temporary database usage, which can spike during complex queries or sorting operations.

### Performance Metrics

**Deadlocks**: The number of deadlocks detected. Any non-zero value needs investigation.

**Sessions count**: Active sessions. Useful for understanding concurrent usage patterns.

**Workers count**: Active worker threads. Approaching the maximum indicates heavy concurrent query execution.

## Viewing Metrics in the Azure Portal

### Quick View

1. Navigate to your database in the Azure Portal.
2. The "Overview" page shows basic metrics - DTU/CPU usage, data size, and pricing tier.
3. Click on any metric chart to expand it with more detail and time range options.

### Metrics Explorer

For deeper analysis:

1. In the left menu, click "Metrics".
2. Select a metric from the dropdown (e.g., "CPU percentage").
3. Choose the aggregation (Average, Max, Min, Sum, Count).
4. Adjust the time range.
5. Click "Add metric" to overlay multiple metrics on the same chart.
6. Click "Pin to dashboard" to save the chart for ongoing monitoring.

Here is a useful combination to view together:
- CPU percentage (average)
- Data IO percentage (average)
- DTU percentage (average)

This trio gives you a complete picture of resource utilization.

## Setting Up Diagnostic Logging

While metrics give you high-level numbers, diagnostic logs provide the details. Enable these to capture query-level information.

### Via Azure Portal

1. Navigate to your database.
2. Under "Monitoring", click "Diagnostic settings".
3. Click "Add diagnostic setting".
4. Name the setting (e.g., "sql-diagnostics").
5. Select a destination:
   - **Log Analytics workspace**: Best for querying and alerting
   - **Storage account**: Best for long-term archival
   - **Event Hub**: Best for streaming to external tools
6. Select the log categories you want:
   - **SQLInsights**: Query performance data
   - **AutomaticTuning**: Automatic tuning events
   - **QueryStoreRuntimeStatistics**: Detailed query execution stats
   - **QueryStoreWaitStatistics**: Wait statistics for queries
   - **Errors**: Database error events
   - **DatabaseWaitStatistics**: Database-level wait stats
   - **Timeouts**: Query timeout events
   - **Blocks**: Blocking information
   - **Deadlocks**: Deadlock graphs
7. Click "Save".

### Via Azure CLI

```bash
# Enable diagnostic logging to a Log Analytics workspace
az monitor diagnostic-settings create \
    --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Sql/servers/myserver/databases/mydb" \
    --name "sql-diagnostics" \
    --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myworkspace" \
    --logs '[
        {"category": "SQLInsights", "enabled": true},
        {"category": "Errors", "enabled": true},
        {"category": "Timeouts", "enabled": true},
        {"category": "Blocks", "enabled": true},
        {"category": "Deadlocks", "enabled": true}
    ]' \
    --metrics '[{"category": "Basic", "enabled": true}]'
```

## Querying Logs with KQL

Once diagnostic data flows to Log Analytics, you can query it with Kusto Query Language (KQL).

Find the slowest queries in the last 24 hours:

```
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.SQL"
| where Category == "QueryStoreRuntimeStatistics"
| where TimeGenerated > ago(24h)
| extend duration_ms = todouble(duration_d) / 1000
| top 20 by duration_ms desc
| project TimeGenerated, query_id_d, duration_ms, cpu_time_d, logical_io_reads_d
```

Find deadlocks:

```
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.SQL"
| where Category == "Deadlocks"
| where TimeGenerated > ago(7d)
| project TimeGenerated, deadlock_xml_s
```

Track connection failures over time:

```
AzureMetrics
| where ResourceProvider == "MICROSOFT.SQL"
| where MetricName == "connection_failed"
| where TimeGenerated > ago(24h)
| summarize FailedConnections = sum(Total) by bin(TimeGenerated, 5m)
| render timechart
```

## Configuring Alerts

Alerts notify you when something goes wrong before users complain.

### Creating a Metric Alert via Azure Portal

1. Navigate to your database.
2. Click "Alerts" in the left menu.
3. Click "New alert rule".
4. Under "Condition", click "Add condition".
5. Select a signal (e.g., "CPU percentage").
6. Configure the threshold:
   - Threshold type: Static
   - Operator: Greater than
   - Threshold value: 80
   - Aggregation type: Average
   - Aggregation granularity: 5 minutes
   - Frequency of evaluation: Every 5 minutes
7. Under "Actions", create or select an action group that defines who gets notified (email, SMS, webhook, etc.).
8. Name the alert and click "Create alert rule".

### Recommended Alert Configuration

Here are the alerts I set up for every production database:

```bash
# Alert when CPU exceeds 80% for 5 minutes
az monitor metrics alert create \
    --resource-group myResourceGroup \
    --name "high-cpu-alert" \
    --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Sql/servers/myserver/databases/mydb" \
    --condition "avg cpu_percent > 80" \
    --window-size 5m \
    --evaluation-frequency 5m \
    --action "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/microsoft.insights/actionGroups/myActionGroup"
```

I recommend setting up alerts for:
- CPU percentage > 80% (warning) and > 95% (critical)
- DTU percentage > 80%
- Storage used > 80% of maximum
- Failed connections > 10 in 5 minutes
- Deadlocks > 0 in 5 minutes
- Blocked by firewall > 0 in 5 minutes

## Building Dashboards

Dashboards give you a single-pane-of-glass view of your database health.

### Creating a Dashboard

1. In the Azure Portal, click "Dashboard" in the left navigation.
2. Click "New dashboard".
3. Name it something like "SQL Database Health".
4. Add tiles by pinning charts from the Metrics Explorer.
5. Arrange the tiles in a logical layout.

A good dashboard layout includes:
- Row 1: CPU, DTU, and Memory metrics
- Row 2: Data IO, Log IO, and Storage usage
- Row 3: Connection counts and failures
- Row 4: Deadlocks, blocks, and session counts

### Sharing Dashboards

Dashboards can be shared with your team:
1. Click "Share" on the dashboard.
2. Choose whether to publish it to the resource group or subscription.
3. Assign RBAC permissions to control who can view it.

## Azure SQL Analytics Solution

For advanced monitoring, consider the Azure SQL Analytics solution (preview). It provides:

- An intelligent monitoring dashboard across all your SQL databases
- Performance trend analysis
- Timeout and error aggregation
- Elastic pool utilization views

To enable it:
1. Go to the Azure Marketplace.
2. Search for "Azure SQL Analytics".
3. Deploy it to your Log Analytics workspace.

## Best Practices

**Set up monitoring before you need it.** Enable diagnostic logging and alerts on day one. When a performance issue hits, you want historical data to compare against.

**Use different alert severity levels.** A CPU warning at 80% might just need attention; 95% is urgent. Configure severity levels and notification channels accordingly.

**Monitor at both server and database levels.** Server-level metrics catch broad issues; database-level metrics pinpoint specific problems.

**Review metrics weekly.** Look for trends, not just spikes. A metric creeping up over weeks is a signal that something needs attention before it becomes critical.

**Automate responses where possible.** Use Azure Automation or Logic Apps to automatically scale up a database when CPU exceeds thresholds, then scale back down during off-peak hours.

## Summary

Azure Monitor provides everything you need to keep your Azure SQL Database healthy and performant. Start with the built-in metrics for quick visibility, enable diagnostic logging for deep analysis, configure alerts for proactive notification, and build dashboards for ongoing monitoring. The combination of real-time metrics, KQL-powered log queries, and automated alerts creates a monitoring setup that catches problems early and gives you the data to fix them quickly.

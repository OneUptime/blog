# How to Enable Slow Query Logging in Azure Database for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Slow Query Log, Performance, Monitoring, Database Optimization, Troubleshooting

Description: Step-by-step guide to enabling and analyzing slow query logs in Azure Database for MySQL Flexible Server to find and fix performance bottlenecks.

---

Slow queries are the silent killers of database performance. A single poorly optimized query running thousands of times a day can bring your database to its knees. The slow query log in MySQL is one of the most effective tools for finding these troublemakers, and Azure Database for MySQL Flexible Server makes it easy to enable and analyze.

In this post, I will show you how to turn on slow query logging, configure it for your needs, route the logs to the right destination, and actually use them to improve performance.

## What the Slow Query Log Captures

When enabled, MySQL logs every query that exceeds a configurable time threshold. For each slow query, the log captures:

- The SQL statement
- Execution time
- Lock wait time
- Rows examined
- Rows sent
- The user and host that ran the query
- Timestamp

This information tells you not just which queries are slow, but why they might be slow. A query that examines millions of rows but returns only a handful is a classic candidate for index optimization.

## Enabling Slow Query Logging

By default, the slow query log is disabled on Azure Database for MySQL Flexible Server. You need to set a few server parameters to turn it on.

### Using Azure CLI

```bash
# Enable the slow query log
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name slow_query_log \
  --value ON

# Set the threshold to 2 seconds (queries slower than this get logged)
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name long_query_time \
  --value 2

# Log queries that do not use indexes
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name log_queries_not_using_indexes \
  --value ON

# Include slow admin statements (ALTER TABLE, ANALYZE TABLE, etc.)
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name log_slow_admin_statements \
  --value ON
```

### Using the Azure Portal

1. Navigate to your MySQL Flexible Server.
2. Click "Server parameters" in the left menu.
3. Search for "slow_query_log" and set it to ON.
4. Set "long_query_time" to your desired threshold (in seconds).
5. Set "log_queries_not_using_indexes" to ON if desired.
6. Click "Save."

All of these are dynamic parameters, so they take effect immediately without a restart.

## Choosing the Right Threshold

The `long_query_time` parameter determines which queries get logged. Setting it too low generates massive logs; setting it too high misses important problems.

Here is my recommendation:

- **Start with 2 seconds**: This catches obviously slow queries without generating too much noise.
- **Lower to 1 second after initial cleanup**: Once you have fixed the worst offenders, lower the threshold to catch more.
- **Consider 0.5 seconds for high-performance requirements**: If your application needs sub-second response times, log anything above 500ms.
- **Never set to 0 in production**: Logging every single query will overwhelm your storage and I/O.

You can also use fractional seconds:

```bash
# Set threshold to 500 milliseconds
az mysql flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-mysql-server \
  --name long_query_time \
  --value 0.5
```

## Routing Logs to Azure Monitor

The slow query log data needs to go somewhere useful. The best destination is Azure Monitor Logs (Log Analytics), which lets you query and analyze the logs with Kusto Query Language (KQL).

### Set Up Diagnostic Settings

```bash
# Send slow query logs to a Log Analytics workspace
az monitor diagnostic-settings create \
  --name mysql-slow-query-diagnostics \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.DBforMySQL/flexibleServers/my-mysql-server" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myLogAnalytics" \
  --logs '[{"category": "MySqlSlowLogs", "enabled": true, "retentionPolicy": {"enabled": true, "days": 30}}]'
```

In the portal:

1. Go to your MySQL server.
2. Click "Diagnostic settings" under Monitoring.
3. Click "Add diagnostic setting."
4. Check "MySqlSlowLogs."
5. Select "Send to Log Analytics workspace."
6. Choose your workspace.
7. Click "Save."

## Analyzing Slow Query Logs with KQL

Once the logs are flowing to Log Analytics, you can write queries to find patterns.

### Find the Top 10 Slowest Queries

```
// Find the 10 slowest queries in the last 24 hours
AzureDiagnostics
| where Category == "MySqlSlowLogs"
| where TimeGenerated > ago(24h)
| project TimeGenerated, query_time_d, lock_time_d, rows_examined_d, rows_sent_d, sql_text_s
| top 10 by query_time_d desc
```

### Find the Most Frequently Slow Queries

```
// Group slow queries by SQL text to find repeat offenders
AzureDiagnostics
| where Category == "MySqlSlowLogs"
| where TimeGenerated > ago(7d)
| summarize
    count(),
    avg(query_time_d),
    max(query_time_d),
    sum(query_time_d)
    by sql_text_s
| order by count_ desc
| take 20
```

### Find Queries Examining Too Many Rows

```
// Queries examining more than 100K rows but returning few
AzureDiagnostics
| where Category == "MySqlSlowLogs"
| where TimeGenerated > ago(24h)
| where rows_examined_d > 100000
| where rows_sent_d < 100
| project TimeGenerated, sql_text_s, rows_examined_d, rows_sent_d, query_time_d
| order by rows_examined_d desc
```

### Track Slow Query Trends Over Time

```
// Hourly count of slow queries over the past week
AzureDiagnostics
| where Category == "MySqlSlowLogs"
| where TimeGenerated > ago(7d)
| summarize SlowQueryCount = count() by bin(TimeGenerated, 1h)
| render timechart
```

## Acting on Slow Query Data

Finding slow queries is only half the battle. Here is how to fix them.

### Step 1: Get the Execution Plan

For each problematic query, run EXPLAIN to understand what MySQL is doing:

```sql
-- Get the execution plan for a slow query
EXPLAIN SELECT o.order_id, c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date > '2026-01-01'
AND o.status = 'pending';
```

Look for:

- **Full table scans** (type = ALL): Add an index.
- **Using filesort**: Consider adding an index that covers the ORDER BY columns.
- **Using temporary**: The query creates a temporary table. Rewrite or add indexes.
- **Large rows_examined values**: The query is scanning too much data.

### Step 2: Add Missing Indexes

If the execution plan shows full table scans, add targeted indexes:

```sql
-- Add a composite index for the common query pattern
CREATE INDEX idx_orders_date_status
ON orders (order_date, status);
```

### Step 3: Rewrite the Query

Sometimes the query itself needs restructuring. Common improvements:

```sql
-- Before: Subquery that runs for each row
SELECT * FROM orders
WHERE customer_id IN (
    SELECT id FROM customers WHERE region = 'US'
);

-- After: JOIN is often more efficient
SELECT o.* FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
WHERE c.region = 'US';
```

### Step 4: Verify the Fix

After making changes, monitor the slow query log to confirm the query no longer appears. You can also run the query with profiling:

```sql
-- Enable profiling for this session
SET profiling = 1;

-- Run the query
SELECT o.order_id, c.customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_date > '2026-01-01' AND o.status = 'pending';

-- View the profile
SHOW PROFILES;
SHOW PROFILE FOR QUERY 1;
```

## Setting Up Alerts for Slow Queries

You can create alerts that fire when slow queries exceed a threshold:

```bash
# Alert when more than 50 slow queries occur in 5 minutes
az monitor scheduled-query create \
  --name "mysql-slow-query-alert" \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myLogAnalytics" \
  --condition "count 'AzureDiagnostics | where Category == \"MySqlSlowLogs\"' > 50" \
  --condition-query "AzureDiagnostics | where Category == 'MySqlSlowLogs'" \
  --window-size 5m \
  --evaluation-frequency 5m \
  --action-groups "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Insights/actionGroups/myActionGroup"
```

## Performance Impact of Slow Query Logging

Enabling the slow query log does have a small performance impact:

- Each logged query requires a write operation.
- The `log_queries_not_using_indexes` option can generate a lot of log entries if many queries lack proper indexes.
- Very high log volumes can affect I/O performance.

In practice, the impact is negligible for most workloads. The insights you gain from slow query analysis far outweigh the minor overhead.

## Best Practices

1. **Always have slow query logging enabled in production.** The minor overhead is worth the visibility.
2. **Review slow query logs weekly.** Make it part of your team's operational routine.
3. **Automate alerts.** Do not wait for users to report slowness.
4. **Lower the threshold gradually.** Start at 2 seconds, then work down as you fix issues.
5. **Combine with Query Store.** The slow query log catches individual slow executions; Query Store gives you aggregate query statistics.

## Summary

Enabling slow query logging in Azure Database for MySQL Flexible Server takes about five minutes and gives you ongoing visibility into performance problems. Route the logs to Log Analytics, set up alerts, and make slow query review a regular habit. The queries you find and fix will have a direct impact on your application's responsiveness and your database's resource utilization.

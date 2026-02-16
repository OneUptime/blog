# How to Use Query Performance Insight in Azure SQL Database to Find Slow Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Query Performance, Performance Tuning, Monitoring, Azure, Database, Optimization

Description: Learn how to use Query Performance Insight in Azure SQL Database to identify slow queries, analyze resource consumption, and improve database performance.

---

Slow queries are the silent killer of application performance. Your users complain about slow page loads, your API response times creep up, and somewhere in your Azure SQL Database, a poorly optimized query is scanning millions of rows when it should be doing an index seek. Query Performance Insight is a built-in tool in Azure SQL Database that helps you find these problem queries without setting up any external monitoring.

In this post, I will show you how to use Query Performance Insight effectively, interpret the data it provides, and take action on the findings.

## What Is Query Performance Insight?

Query Performance Insight (QPI) is a visualization tool built into the Azure Portal that shows you which queries are consuming the most resources in your database. It builds on top of the Query Store, which tracks query execution statistics over time.

QPI answers three key questions:

1. Which queries are consuming the most CPU, data I/O, or log I/O?
2. How have query performance patterns changed over time?
3. What are the individual execution details for a specific query?

## Prerequisites

Query Performance Insight requires the Query Store to be enabled on your database. For Azure SQL Database, Query Store is enabled by default. You can verify this with:

```sql
-- Check if Query Store is enabled
SELECT actual_state_desc, desired_state_desc
FROM sys.database_query_store_options;
```

If it shows "OFF", enable it:

```sql
-- Enable Query Store on the database
ALTER DATABASE CURRENT SET QUERY_STORE = ON;
```

## Accessing Query Performance Insight

1. Go to the Azure Portal.
2. Navigate to your SQL database.
3. In the left menu, under "Intelligent Performance", click "Query Performance Insight".

You will see a dashboard with two main views: a timeline chart showing resource consumption over time, and a list of the top resource-consuming queries.

## Understanding the Dashboard

### Resource Consumption Chart

The top section shows a timeline of resource usage. You can switch between three metrics:

- **CPU**: Total CPU consumption by queries over time
- **Data IO**: Physical reads from data files
- **Log IO**: Writes to the transaction log

The chart shows stacked bars where each color represents a different query. This immediately reveals which queries dominate your resource usage. Often, you will see that 2-3 queries account for 80% or more of total consumption.

### Time Range Selection

You can adjust the time range to look at the last hour, 24 hours, 7 days, or a custom range. Looking at different time ranges helps you distinguish between:

- One-time spikes (a single bad query execution)
- Recurring patterns (a nightly batch job that hammers the database)
- Gradual degradation (a query getting slower as the data grows)

### Top Queries List

Below the chart, you see a numbered list of the top queries ranked by resource consumption. For each query, you see:

- The query ID
- The CPU/IO consumption as a percentage of total
- The query text (truncated - click to see the full text)
- The execution count

## Drilling into a Specific Query

Click on any query in the list to see its details. The detail view shows:

**Query text**: The full SQL statement. This is often the most important piece of information. Look for obvious problems like missing WHERE clauses, SELECT *, or unnecessary JOINs.

**Execution statistics over time**: A chart showing how the query's performance has changed. This helps you identify when a query started performing poorly. Did it coincide with a deployment? A data growth milestone? A missing index?

**Per-execution metrics**: Average duration, CPU time, logical reads, physical reads, and execution count. These numbers tell you whether the query is expensive because it runs frequently (high count, low per-execution cost) or because each execution is expensive (low count, high per-execution cost).

## Common Patterns and How to Fix Them

### Pattern 1: One Query Dominates CPU

You see a single query taking 60%+ of CPU. This is usually a query that either runs very frequently or has a bad execution plan.

**Investigation steps**:
1. Look at the query text. Is it doing a full table scan?
2. Check the execution plan (you will need SSMS or Azure Data Studio for this).
3. Look for missing indexes.

```sql
-- Find missing index recommendations for the current database
-- These suggest indexes that the query optimizer thinks would help
SELECT
    migs.avg_user_impact AS estimated_improvement_percent,
    mid.statement AS table_name,
    mid.equality_columns,
    mid.inequality_columns,
    mid.included_columns,
    migs.user_seeks,
    migs.user_scans
FROM sys.dm_db_missing_index_group_stats migs
JOIN sys.dm_db_missing_index_groups mig ON migs.group_handle = mig.index_group_handle
JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle
ORDER BY migs.avg_user_impact DESC;
```

### Pattern 2: Many Small Queries Add Up

No single query is a problem, but thousands of small queries collectively consume most of the CPU. This is common with ORM-generated queries that execute one at a time instead of batching.

**Investigation steps**:
1. Look at the execution count. If a query runs 100,000 times in an hour, even 1ms per execution adds up.
2. Consider batching, caching, or query consolidation at the application level.
3. Check if the ORM is generating N+1 query patterns.

### Pattern 3: Data IO Spikes

Queries that cause high physical reads are often scanning large tables without appropriate indexes. They force data to be read from disk instead of the buffer cache.

**Investigation steps**:
1. Check if the query has appropriate indexes.
2. Look at the table's row count and average row size.
3. Consider adding covering indexes to avoid key lookups.

### Pattern 4: Query Plan Regression

A query that used to be fast suddenly became slow. The chart in QPI shows a clear inflection point. This is often caused by parameter sniffing or statistics becoming stale.

**Fix**:

```sql
-- Force recompilation of a specific query plan
-- This makes the optimizer create a fresh plan
EXEC sp_recompile 'dbo.YourProcedureName';
```

Or update statistics:

```sql
-- Update statistics for a specific table
-- This gives the query optimizer better data distribution information
UPDATE STATISTICS dbo.YourTableName WITH FULLSCAN;
```

## Using Query Store Directly

While QPI provides a nice visual interface, sometimes you need to query the underlying data directly. The Query Store views give you programmatic access.

Find the top 10 queries by average CPU time:

```sql
-- Top 10 queries by average CPU consumption
SELECT TOP 10
    qt.query_sql_text,
    q.query_id,
    rs.avg_cpu_time,
    rs.count_executions,
    rs.avg_duration,
    rs.avg_logical_io_reads,
    rs.last_execution_time
FROM sys.query_store_query_text qt
JOIN sys.query_store_query q ON qt.query_text_id = q.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
JOIN sys.query_store_runtime_stats_interval rsi ON rs.runtime_stats_interval_id = rsi.runtime_stats_interval_id
WHERE rsi.start_time > DATEADD(HOUR, -24, GETUTCDATE())
ORDER BY rs.avg_cpu_time DESC;
```

Find queries with plan regressions (queries that used to be fast and are now slow):

```sql
-- Find queries where recent performance is worse than historical
SELECT
    q.query_id,
    qt.query_sql_text,
    rs_recent.avg_duration AS recent_avg_duration,
    rs_old.avg_duration AS historical_avg_duration,
    (rs_recent.avg_duration - rs_old.avg_duration) AS duration_increase
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs_recent ON p.plan_id = rs_recent.plan_id
JOIN sys.query_store_runtime_stats rs_old ON p.plan_id = rs_old.plan_id
JOIN sys.query_store_runtime_stats_interval rsi_recent ON rs_recent.runtime_stats_interval_id = rsi_recent.runtime_stats_interval_id
JOIN sys.query_store_runtime_stats_interval rsi_old ON rs_old.runtime_stats_interval_id = rsi_old.runtime_stats_interval_id
WHERE rsi_recent.start_time > DATEADD(HOUR, -1, GETUTCDATE())
    AND rsi_old.start_time BETWEEN DATEADD(DAY, -7, GETUTCDATE()) AND DATEADD(DAY, -1, GETUTCDATE())
    AND rs_recent.avg_duration > rs_old.avg_duration * 2
ORDER BY duration_increase DESC;
```

## Setting Up Alerts

You can create Azure Monitor alerts based on database performance metrics:

1. Go to your database in the Portal.
2. Click "Alerts" in the left menu.
3. Click "+ New alert rule".
4. Select metrics like "CPU percentage", "DTU percentage", or "Data IO percentage".
5. Set a threshold and notification method.

For example, alert when CPU percentage exceeds 80% for more than 5 minutes. This gives you a heads-up before users notice.

## Best Practices

**Check QPI weekly.** Make it part of your operational routine. Catching a slowly degrading query early is much easier than debugging a crisis.

**Look at trends, not just snapshots.** A query using 30% CPU today might have been using 5% a month ago. The trend matters more than the current number.

**Compare time periods.** Use the time range selector to compare before and after deployments, before and after data growth, or weekday vs weekend patterns.

**Combine QPI with execution plans.** QPI tells you which queries to investigate. Execution plans tell you why they are slow. Use both tools together.

**Act on the top 3-5 queries.** Do not try to optimize everything at once. Focus on the biggest consumers first. Often, fixing 2-3 queries resolves 80% of your performance problems.

## Summary

Query Performance Insight is one of the most useful built-in tools in Azure SQL Database. It shows you exactly which queries are consuming your resources, how their performance changes over time, and gives you the information you need to start optimizing. Check it regularly, use it to identify patterns, and combine it with execution plan analysis and the Query Store views for deep investigation. Most performance problems can be traced back to a handful of queries, and QPI helps you find them quickly.

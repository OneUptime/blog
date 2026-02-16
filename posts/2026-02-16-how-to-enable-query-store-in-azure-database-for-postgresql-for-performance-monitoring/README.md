# How to Enable Query Store in Azure Database for PostgreSQL for Performance Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PostgreSQL, Query Store, Performance Monitoring, Database Optimization, Flexible Server, Troubleshooting

Description: Learn how to enable and use Query Store in Azure Database for PostgreSQL Flexible Server to track query performance and identify optimization opportunities.

---

Finding and fixing slow queries is one of the most impactful things you can do for database performance. But you cannot fix what you cannot measure. Query Store in Azure Database for PostgreSQL Flexible Server automatically captures query execution statistics, giving you a historical record of how every query performs over time. Unlike point-in-time tools like pg_stat_statements, Query Store retains data across server restarts and lets you compare performance across different time periods.

In this post, I will show you how to enable Query Store, query the collected data, and use it to find and fix performance problems.

## What Query Store Captures

Query Store tracks:

- **Query text**: The normalized SQL statement.
- **Execution statistics**: Calls, total time, mean time, min/max time, rows affected.
- **Wait statistics**: What the query was waiting on (I/O, locks, CPU, memory).
- **Runtime parameters**: Statistics broken down by time intervals.

This data accumulates over time, so you can answer questions like:

- Which queries got slower after last week's deployment?
- What are the top resource-consuming queries this month?
- Which queries are waiting on locks most often?

## Enabling Query Store

Query Store uses the `pg_qs` extension, which needs to be loaded at server startup.

### Step 1: Enable the Extension

```bash
# Add pg_qs to shared_preload_libraries
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name shared_preload_libraries \
  --value "pg_qs,pg_stat_statements"
```

### Step 2: Enable Query Store Tracking

```bash
# Enable query capture mode
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pg_qs.query_capture_mode \
  --value "ALL"
```

The capture modes are:

| Mode | Description |
|------|-------------|
| NONE | No queries captured (disabled) |
| TOP | Captures top-level queries only |
| ALL | Captures all queries including nested ones |

For most environments, `ALL` is recommended. Use `TOP` if you want to reduce overhead.

### Step 3: Enable Wait Statistics (Optional but Recommended)

```bash
# Enable wait statistics collection
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgms_wait_sampling.query_capture_mode \
  --value "ALL"

# Set the sampling frequency (milliseconds)
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgms_wait_sampling.history_period \
  --value 100
```

### Step 4: Restart the Server

Since `shared_preload_libraries` is a static parameter, restart the server:

```bash
# Restart to apply changes
az postgres flexible-server restart \
  --resource-group myResourceGroup \
  --name my-pg-server
```

### Step 5: Verify Query Store Is Active

```sql
-- Check that Query Store is running
SHOW pg_qs.query_capture_mode;
-- Should return 'ALL' or 'TOP'

-- Check the Query Store schema exists
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'query_store';
```

## Querying the Query Store Data

Query Store data is stored in the `query_store` schema. Here are the most useful queries.

### Top Queries by Total Execution Time

```sql
-- Find the queries consuming the most total time
SELECT
    qs.query_id,
    qt.query_sql_text,
    qs.calls_count,
    round(qs.total_time::numeric, 2) AS total_time_ms,
    round(qs.mean_time::numeric, 2) AS mean_time_ms,
    round(qs.max_time::numeric, 2) AS max_time_ms,
    qs.rows_affected
FROM query_store.qs_view qs
JOIN query_store.query_texts_view qt ON qs.query_text_id = qt.query_text_id
WHERE qs.start_time > NOW() - INTERVAL '24 hours'
ORDER BY qs.total_time DESC
LIMIT 20;
```

### Top Queries by Average Execution Time

```sql
-- Find the slowest queries on average
SELECT
    qs.query_id,
    qt.query_sql_text,
    qs.calls_count,
    round(qs.mean_time::numeric, 2) AS mean_time_ms,
    round(qs.stddev_time::numeric, 2) AS stddev_time_ms,
    round(qs.max_time::numeric, 2) AS max_time_ms
FROM query_store.qs_view qs
JOIN query_store.query_texts_view qt ON qs.query_text_id = qt.query_text_id
WHERE qs.start_time > NOW() - INTERVAL '24 hours'
  AND qs.calls_count > 10  -- Filter out rare queries
ORDER BY qs.mean_time DESC
LIMIT 20;
```

### Queries with High Variance

High variance in execution time often indicates a query that sometimes uses an index and sometimes does a sequential scan:

```sql
-- Find queries with highly variable execution times
SELECT
    qs.query_id,
    qt.query_sql_text,
    qs.calls_count,
    round(qs.mean_time::numeric, 2) AS mean_time_ms,
    round(qs.min_time::numeric, 2) AS min_time_ms,
    round(qs.max_time::numeric, 2) AS max_time_ms,
    round(qs.stddev_time::numeric, 2) AS stddev_ms,
    round((qs.stddev_time / NULLIF(qs.mean_time, 0) * 100)::numeric, 1) AS cv_percent
FROM query_store.qs_view qs
JOIN query_store.query_texts_view qt ON qs.query_text_id = qt.query_text_id
WHERE qs.start_time > NOW() - INTERVAL '7 days'
  AND qs.calls_count > 50
  AND qs.mean_time > 10  -- Only queries averaging more than 10ms
ORDER BY (qs.stddev_time / NULLIF(qs.mean_time, 0)) DESC
LIMIT 20;
```

### Wait Statistics Analysis

Wait statistics tell you what queries are waiting on - this is often more useful than execution time alone:

```sql
-- Find the top wait events
SELECT
    ws.event_type,
    ws.event,
    ws.calls,
    round(ws.total_time::numeric, 2) AS total_wait_ms
FROM query_store.pgms_wait_sampling_view ws
WHERE ws.start_time > NOW() - INTERVAL '24 hours'
ORDER BY ws.total_time DESC
LIMIT 20;
```

```sql
-- Find queries with the most lock waits
SELECT
    qs.query_id,
    qt.query_sql_text,
    ws.event,
    ws.calls AS wait_count,
    round(ws.total_time::numeric, 2) AS total_wait_ms
FROM query_store.pgms_wait_sampling_view ws
JOIN query_store.qs_view qs ON ws.query_id = qs.query_id
JOIN query_store.query_texts_view qt ON qs.query_text_id = qt.query_text_id
WHERE ws.event_type = 'Lock'
  AND ws.start_time > NOW() - INTERVAL '24 hours'
ORDER BY ws.total_time DESC
LIMIT 10;
```

### Comparing Performance Across Time Periods

This is where Query Store really shines - comparing before and after a deployment:

```sql
-- Compare query performance between two time periods
-- Before deployment vs. after deployment
WITH before AS (
    SELECT query_id, query_text_id,
        SUM(calls_count) AS calls,
        AVG(mean_time) AS avg_time
    FROM query_store.qs_view
    WHERE start_time BETWEEN '2026-02-14 00:00:00' AND '2026-02-15 00:00:00'
    GROUP BY query_id, query_text_id
),
after AS (
    SELECT query_id, query_text_id,
        SUM(calls_count) AS calls,
        AVG(mean_time) AS avg_time
    FROM query_store.qs_view
    WHERE start_time BETWEEN '2026-02-15 00:00:00' AND '2026-02-16 00:00:00'
    GROUP BY query_id, query_text_id
)
SELECT
    qt.query_sql_text,
    round(b.avg_time::numeric, 2) AS before_avg_ms,
    round(a.avg_time::numeric, 2) AS after_avg_ms,
    round(((a.avg_time - b.avg_time) / NULLIF(b.avg_time, 0) * 100)::numeric, 1) AS change_percent
FROM before b
JOIN after a ON b.query_id = a.query_id
JOIN query_store.query_texts_view qt ON b.query_text_id = qt.query_text_id
WHERE b.avg_time > 0
ORDER BY (a.avg_time - b.avg_time) DESC
LIMIT 20;
```

## Using Query Store in the Azure Portal

Azure provides a visual interface for Query Store data:

1. Navigate to your PostgreSQL Flexible Server in the portal.
2. Click "Query Performance Insight" under Intelligent Performance.
3. View top queries by duration, execution count, or wait statistics.
4. Drill into specific queries to see their execution history.

The portal view is great for quick analysis. For deeper investigation, query the views directly.

## Configuring Retention and Storage

Control how much data Query Store keeps:

```bash
# Set retention period to 14 days (default is 7)
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pg_qs.retention_period_in_days \
  --value 14

# Set the data collection interval (default is 15 minutes)
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pg_qs.interval_length_minutes \
  --value 5
```

Shorter intervals give more granular data but increase storage usage.

## Query Store vs. pg_stat_statements

Both tools track query performance, but they serve different purposes:

| Feature | Query Store | pg_stat_statements |
|---------|------------|-------------------|
| Time-series data | Yes (historical) | No (cumulative since last reset) |
| Wait statistics | Yes | No |
| Survives restarts | Yes | Depends on configuration |
| Portal integration | Yes | No |
| Overhead | Moderate | Low |
| Query plan tracking | No | No |

I recommend using both. pg_stat_statements for quick real-time checks, and Query Store for historical analysis and trend detection.

## Performance Impact

Query Store does add some overhead:

- Write operations take slightly longer due to statistics collection.
- Storage is consumed for the captured data.
- The collection process uses some CPU.

For most workloads, the overhead is under 5% and well worth the visibility it provides. If you are running a latency-sensitive workload where every microsecond matters, use `TOP` mode instead of `ALL` to reduce overhead.

## Cleaning Up Old Data

Query Store automatically cleans up data older than the retention period. If you need to manually clean up:

```sql
-- Reset all Query Store data (use carefully)
SELECT query_store.qs_reset();
```

## Summary

Query Store in Azure Database for PostgreSQL Flexible Server is an essential tool for understanding and improving query performance. Enable it on every server - the small overhead is far outweighed by the visibility it provides. Use it to find your slowest queries, identify regression after deployments, and understand what your queries are waiting on. Combined with pg_stat_statements for real-time monitoring, Query Store gives you a complete picture of your database's performance over time.

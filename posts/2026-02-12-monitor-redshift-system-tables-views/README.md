# How to Monitor Redshift with System Tables and Views

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, Monitoring, Data Warehouse

Description: Learn how to use Redshift system tables and views to monitor query performance, disk usage, workload patterns, and cluster health.

---

CloudWatch gives you the high-level Redshift metrics - CPU, disk usage, connection count. But for real operational insight, you need to dig into Redshift's system tables and views. They show you exactly which queries are slow, why they're slow, which tables need maintenance, and where your storage is going. It's the difference between knowing your cluster is busy and knowing what's making it busy.

## System Table Categories

Redshift has several categories of system tables:

- **STL tables** - System log tables. Historical query execution data. Retained for a few days.
- **STV tables** - System view tables. Current snapshot of cluster state.
- **SVV views** - System visibility views. Combine multiple system tables for convenience.
- **SVL views** - System log views. Combine log tables for easier analysis.

The ones you'll use most are STL (for historical analysis) and STV (for real-time monitoring).

## Monitoring Active Queries

See what's currently running on your cluster:

```sql
-- Currently running queries
SELECT
    query,
    pid,
    TRIM(user_name) AS user_name,
    TRIM(querytxt) AS sql,
    starttime,
    DATEDIFF(second, starttime, GETDATE()) AS running_seconds,
    suspended
FROM stv_recents
WHERE status = 'Running'
ORDER BY running_seconds DESC;

-- Currently queued queries (waiting to run)
SELECT
    query,
    pid,
    TRIM(user_name) AS user_name,
    TRIM(querytxt) AS sql,
    starttime,
    DATEDIFF(second, starttime, GETDATE()) AS waiting_seconds
FROM stv_recents
WHERE status = 'Queued'
ORDER BY waiting_seconds DESC;
```

## Finding Slow Queries

Identify your slowest queries over the past 24 hours:

```sql
-- Top 20 slowest queries in the last 24 hours
SELECT
    q.query,
    TRIM(q.querytxt) AS sql,
    q.starttime,
    q.endtime,
    DATEDIFF(millisecond, q.starttime, q.endtime) AS duration_ms,
    q.elapsed / 1000000.0 AS elapsed_seconds,
    q.aborted,
    TRIM(u.usename) AS user_name
FROM stl_query q
JOIN pg_user u ON q.userid = u.usesysid
WHERE q.starttime > DATEADD(hour, -24, GETDATE())
  AND q.querytxt NOT LIKE 'padb_fetch%'  -- Exclude system queries
  AND q.querytxt NOT LIKE 'COPY ANALYZE%'
  AND q.aborted = 0
ORDER BY elapsed_seconds DESC
LIMIT 20;
```

Get more detail about why a specific query was slow:

```sql
-- Query execution steps for a slow query
SELECT
    query,
    segment,
    step,
    TRIM(label) AS operation,
    rows,
    bytes,
    elapsed / 1000 AS elapsed_ms,
    is_diskbased  -- True means it spilled to disk (bad for performance)
FROM stl_query_metrics
WHERE query = 12345  -- Replace with your query ID
ORDER BY segment, step;
```

## Query Queue Wait Times

Track how long queries wait before they start running:

```sql
-- Average queue wait time by hour
SELECT
    DATE_TRUNC('hour', starttime) AS hour,
    service_class,
    COUNT(*) AS query_count,
    AVG(total_queue_time) / 1000000.0 AS avg_wait_seconds,
    MAX(total_queue_time) / 1000000.0 AS max_wait_seconds,
    AVG(total_exec_time) / 1000000.0 AS avg_exec_seconds
FROM stl_wlm_query
WHERE starttime > DATEADD(hour, -24, GETDATE())
GROUP BY DATE_TRUNC('hour', starttime), service_class
ORDER BY hour DESC, service_class;
```

If wait times are consistently high, you need to either increase WLM concurrency or enable concurrency scaling for that queue. Check our guide on [configuring Redshift concurrency scaling](https://oneuptime.com/blog/post/2026-02-12-configure-redshift-concurrency-scaling/view) for details.

## Disk Usage and Storage

Monitor how much storage your tables use:

```sql
-- Table sizes in your database
SELECT
    TRIM(pgn.nspname) AS schema_name,
    TRIM(pgt.relname) AS table_name,
    pgt.reltuples::BIGINT AS row_count,
    SUM(b.mbytes) AS total_mb,
    SUM(b.mbytes) / 1024.0 AS total_gb,
    COUNT(DISTINCT b.slice) AS num_slices
FROM
    (SELECT tbl, name, slice, COUNT(*) AS mbytes
     FROM stv_blocklist
     GROUP BY tbl, name, slice) b
JOIN pg_class pgt ON b.tbl = pgt.oid
JOIN pg_namespace pgn ON pgn.oid = pgt.relnamespace
WHERE pgn.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_internal')
GROUP BY pgn.nspname, pgt.relname, pgt.reltuples
ORDER BY total_mb DESC
LIMIT 30;
```

Check overall cluster disk usage:

```sql
-- Cluster disk space utilization
SELECT
    owner AS node,
    used,
    capacity,
    ROUND(used::FLOAT / capacity * 100, 2) AS pct_used
FROM stv_partitions
WHERE type = 0
ORDER BY node;
```

## Table Maintenance Status

Redshift tables need periodic VACUUM (to reclaim deleted space and re-sort) and ANALYZE (to update statistics).

Find tables that need maintenance:

```sql
-- Tables needing VACUUM (high percentage of deleted rows)
SELECT
    TRIM(pgn.nspname) AS schema_name,
    TRIM(pgt.relname) AS table_name,
    pgt.reltuples::BIGINT AS total_rows,
    t.empty AS empty_blocks,
    t.unsorted_rows,
    ROUND(t.unsorted_rows::FLOAT / GREATEST(pgt.reltuples, 1) * 100, 2) AS pct_unsorted,
    t.stats_off AS stats_staleness
FROM svv_table_info t
JOIN pg_class pgt ON t.table_id = pgt.oid
JOIN pg_namespace pgn ON pgn.oid = pgt.relnamespace
WHERE t.unsorted_rows > 0
   OR t.stats_off > 10
ORDER BY t.unsorted_rows DESC
LIMIT 20;

-- More detailed table info
SELECT
    "schema" AS schema_name,
    "table" AS table_name,
    size AS size_mb,
    tbl_rows,
    unsorted,
    stats_off,
    skew_rows
FROM svv_table_info
WHERE "schema" NOT IN ('pg_internal')
ORDER BY size DESC
LIMIT 30;
```

Run maintenance on tables that need it:

```sql
-- Vacuum tables with many deleted rows
VACUUM DELETE ONLY sales.orders;

-- Full vacuum with re-sort
VACUUM FULL sales.orders;

-- Update statistics
ANALYZE sales.orders;

-- Analyze all tables
ANALYZE;
```

## Connection Monitoring

Track active connections and connection patterns:

```sql
-- Current connections
SELECT
    TRIM(user_name) AS user_name,
    db_name,
    COUNT(*) AS connections,
    MAX(starttime) AS latest_connection
FROM stv_sessions
GROUP BY user_name, db_name
ORDER BY connections DESC;

-- Connection history
SELECT
    DATE_TRUNC('hour', starttime) AS hour,
    COUNT(*) AS new_connections,
    COUNT(DISTINCT TRIM(user_name)) AS unique_users
FROM stl_connection_log
WHERE event = 'initiating session'
  AND starttime > DATEADD(day, -7, GETDATE())
GROUP BY DATE_TRUNC('hour', starttime)
ORDER BY hour DESC;
```

## Query Pattern Analysis

Understand your workload patterns:

```sql
-- Query volume by hour and user
SELECT
    DATE_TRUNC('hour', starttime) AS hour,
    TRIM(u.usename) AS user_name,
    COUNT(*) AS query_count,
    AVG(DATEDIFF(millisecond, q.starttime, q.endtime)) AS avg_duration_ms,
    SUM(CASE WHEN q.aborted = 1 THEN 1 ELSE 0 END) AS aborted_count
FROM stl_query q
JOIN pg_user u ON q.userid = u.usesysid
WHERE q.starttime > DATEADD(day, -1, GETDATE())
  AND q.querytxt NOT LIKE 'padb_fetch%'
GROUP BY DATE_TRUNC('hour', starttime), u.usename
ORDER BY hour DESC, query_count DESC;

-- Most frequently run queries (by pattern)
SELECT
    TRIM(REGEXP_REPLACE(querytxt, '[0-9]+', 'N')) AS query_pattern,
    COUNT(*) AS execution_count,
    AVG(DATEDIFF(millisecond, starttime, endtime)) AS avg_duration_ms,
    SUM(DATEDIFF(millisecond, starttime, endtime)) AS total_duration_ms
FROM stl_query
WHERE starttime > DATEADD(day, -1, GETDATE())
  AND querytxt NOT LIKE 'padb_fetch%'
GROUP BY TRIM(REGEXP_REPLACE(querytxt, '[0-9]+', 'N'))
ORDER BY total_duration_ms DESC
LIMIT 20;
```

This second query replaces numbers with 'N' to group similar queries that differ only in parameter values.

## Lock Monitoring

Detect lock contention that slows down queries:

```sql
-- Current locks and what's waiting
SELECT
    l.table_id,
    TRIM(pgt.relname) AS table_name,
    l.lock_mode,
    l.granted,
    l.pid,
    TRIM(s.user_name) AS user_name,
    TRIM(q.querytxt) AS query
FROM pg_locks l
LEFT JOIN pg_class pgt ON l.relation = pgt.oid
LEFT JOIN stv_sessions s ON l.pid = s.process
LEFT JOIN stv_recents q ON l.pid = q.pid AND q.status = 'Running'
WHERE l.granted = false  -- Show blocked locks
ORDER BY l.pid;
```

## Building a Monitoring Dashboard

Combine these queries into a stored procedure that outputs a health summary:

```sql
CREATE OR REPLACE PROCEDURE admin.cluster_health_check()
AS $$
DECLARE
    active_queries INT;
    queued_queries INT;
    disk_pct FLOAT;
    tables_needing_vacuum INT;
BEGIN
    -- Count active queries
    SELECT COUNT(*) INTO active_queries
    FROM stv_recents WHERE status = 'Running';

    -- Count queued queries
    SELECT COUNT(*) INTO queued_queries
    FROM stv_recents WHERE status = 'Queued';

    -- Get disk utilization
    SELECT ROUND(AVG(used::FLOAT / capacity * 100), 2) INTO disk_pct
    FROM stv_partitions WHERE type = 0;

    -- Count tables needing vacuum
    SELECT COUNT(*) INTO tables_needing_vacuum
    FROM svv_table_info
    WHERE unsorted > 20 OR stats_off > 20;

    RAISE INFO 'Cluster Health Report';
    RAISE INFO '=====================';
    RAISE INFO 'Active Queries: %', active_queries;
    RAISE INFO 'Queued Queries: %', queued_queries;
    RAISE INFO 'Disk Utilization: %', disk_pct || '%';
    RAISE INFO 'Tables Needing Vacuum: %', tables_needing_vacuum;
END;
$$ LANGUAGE plpgsql;

-- Run it
CALL admin.cluster_health_check();
```

## Automated Monitoring with Lambda

Query system tables periodically and push metrics to CloudWatch:

```python
import boto3
import redshift_connector

redshift_data = boto3.client("redshift-data")
cloudwatch = boto3.client("cloudwatch")


def lambda_handler(event, context):
    """Collect Redshift metrics from system tables."""

    queries = {
        "active_queries": "SELECT COUNT(*) FROM stv_recents WHERE status = 'Running'",
        "queued_queries": "SELECT COUNT(*) FROM stv_recents WHERE status = 'Queued'",
        "active_connections": "SELECT COUNT(*) FROM stv_sessions",
    }

    metrics = []
    for metric_name, sql in queries.items():
        response = redshift_data.execute_statement(
            WorkgroupName="analytics-workgroup",
            Database="analytics_db",
            Sql=sql,
        )

        # Wait for result (simplified - use waiter in production)
        import time
        time.sleep(2)

        result = redshift_data.get_statement_result(Id=response["Id"])
        value = float(result["Records"][0][0]["longValue"])

        metrics.append({
            "MetricName": metric_name,
            "Value": value,
            "Unit": "Count",
        })

    # Push to CloudWatch
    cloudwatch.put_metric_data(
        Namespace="Custom/Redshift",
        MetricData=metrics,
    )

    return {"metrics_published": len(metrics)}
```

For a complete monitoring solution that covers Redshift along with the rest of your infrastructure, check out our guide on [setting up CloudWatch dashboards](https://oneuptime.com/blog/post/aws-cloudwatch-dashboards/view).

## Wrapping Up

Redshift's system tables give you deep visibility that CloudWatch metrics alone can't provide. Use STL tables for historical query analysis, STV tables for real-time monitoring, and SVV views for convenient summaries. The most impactful queries to run regularly are: slow query identification, table maintenance status, queue wait times, and disk utilization. Build these into automated monitoring and you'll catch performance issues before your users notice them.

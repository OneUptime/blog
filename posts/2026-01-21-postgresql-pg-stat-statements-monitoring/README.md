# How to Monitor PostgreSQL with pg_stat_statements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Monitoring, Performance, pg_stat_statements, Database Administration

Description: Learn how to use pg_stat_statements to identify slow queries, track database performance over time, and optimize your PostgreSQL workload with practical examples.

---

You cannot optimize what you cannot measure. pg_stat_statements tracks execution statistics for all SQL statements, helping you find slow queries, identify resource hogs, and track performance trends. It is the single most valuable extension for PostgreSQL performance tuning.

## Enabling pg_stat_statements

The extension requires a configuration change and server restart:

```bash
# Edit postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
pg_stat_statements.max = 10000
```

Restart PostgreSQL and create the extension:

```sql
-- Create the extension
CREATE EXTENSION pg_stat_statements;

-- Verify it's working
SELECT count(*) FROM pg_stat_statements;
```

## Configuration Options

Fine-tune the extension behavior:

```sql
-- Check current settings
SHOW pg_stat_statements.track;      -- top, all, or none
SHOW pg_stat_statements.max;        -- maximum statements tracked
SHOW pg_stat_statements.track_utility;  -- track non-DML statements
SHOW pg_stat_statements.track_planning; -- track planning time
```

Recommended settings:

```ini
# postgresql.conf
pg_stat_statements.track = all           # Track nested statements too
pg_stat_statements.max = 10000           # Store up to 10k unique queries
pg_stat_statements.track_utility = on    # Track DDL, COPY, etc.
pg_stat_statements.track_planning = on   # Track planning time (v13+)
pg_stat_statements.save = on             # Persist across restarts
```

## Understanding the Statistics

The view contains one row per unique query pattern:

```sql
SELECT
    queryid,
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read
FROM pg_stat_statements
LIMIT 5;
```

Key columns explained:

| Column | Description |
|--------|-------------|
| queryid | Hash of the query pattern |
| query | Normalized query text (parameters replaced with $1, $2) |
| calls | Number of times executed |
| total_exec_time | Cumulative execution time (ms) |
| mean_exec_time | Average execution time (ms) |
| rows | Total rows returned or affected |
| shared_blks_hit | Buffer cache hits |
| shared_blks_read | Disk reads required |

## Finding Slow Queries

### Top Queries by Total Time

The queries consuming the most cumulative time:

```sql
SELECT
    substring(query, 1, 80) AS query_preview,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percent_total
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

### Slowest Individual Queries

Queries with the highest average execution time:

```sql
SELECT
    substring(query, 1, 80) AS query_preview,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_time_ms,
    round(min_exec_time::numeric, 2) AS min_time_ms,
    round(max_exec_time::numeric, 2) AS max_time_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms
FROM pg_stat_statements
WHERE calls > 10  -- Ignore rarely executed queries
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Most Frequently Called Queries

High-frequency queries even if fast individually:

```sql
SELECT
    substring(query, 1, 80) AS query_preview,
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS mean_time_ms
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;
```

## Analyzing I/O Patterns

### Queries with High Disk Reads

These queries bypass the buffer cache:

```sql
SELECT
    substring(query, 1, 60) AS query_preview,
    calls,
    shared_blks_read AS disk_reads,
    shared_blks_hit AS cache_hits,
    round(
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0),
        2
    ) AS cache_hit_ratio
FROM pg_stat_statements
WHERE shared_blks_read > 0
ORDER BY shared_blks_read DESC
LIMIT 20;
```

### Identify Sequential Scans

Queries reading many blocks are likely doing sequential scans:

```sql
SELECT
    substring(query, 1, 60) AS query_preview,
    calls,
    rows,
    shared_blks_hit + shared_blks_read AS total_blocks,
    round((shared_blks_hit + shared_blks_read)::numeric / nullif(calls, 0), 2) AS blocks_per_call
FROM pg_stat_statements
WHERE (shared_blks_hit + shared_blks_read) / nullif(calls, 0) > 1000
ORDER BY total_blocks DESC
LIMIT 20;
```

## Tracking Temporary File Usage

Queries spilling to disk indicate memory pressure:

```sql
SELECT
    substring(query, 1, 60) AS query_preview,
    calls,
    temp_blks_read,
    temp_blks_written,
    round(mean_exec_time::numeric, 2) AS mean_time_ms
FROM pg_stat_statements
WHERE temp_blks_written > 0
ORDER BY temp_blks_written DESC
LIMIT 20;
```

Consider increasing work_mem for these queries or optimizing the query itself.

## Monitoring Over Time

### Reset Statistics Periodically

```sql
-- Reset all statistics
SELECT pg_stat_statements_reset();

-- Reset specific user's statistics (v14+)
SELECT pg_stat_statements_reset(
    userid => (SELECT usesysid FROM pg_user WHERE usename = 'app_user'),
    dbid => 0,
    queryid => 0
);
```

### Snapshot Statistics for Trending

Create a table to store snapshots:

```sql
CREATE TABLE pg_stat_statements_history (
    snapshot_time timestamptz DEFAULT now(),
    queryid bigint,
    query text,
    calls bigint,
    total_exec_time double precision,
    rows bigint,
    shared_blks_hit bigint,
    shared_blks_read bigint
);

-- Take a snapshot
INSERT INTO pg_stat_statements_history
    (queryid, query, calls, total_exec_time, rows, shared_blks_hit, shared_blks_read)
SELECT
    queryid, query, calls, total_exec_time, rows, shared_blks_hit, shared_blks_read
FROM pg_stat_statements;

-- Compare snapshots
SELECT
    h2.queryid,
    substring(h2.query, 1, 50) AS query,
    h2.calls - h1.calls AS new_calls,
    round((h2.total_exec_time - h1.total_exec_time)::numeric, 2) AS new_time_ms
FROM pg_stat_statements_history h1
JOIN pg_stat_statements_history h2 ON h1.queryid = h2.queryid
WHERE h1.snapshot_time = '2026-01-20 00:00:00'
  AND h2.snapshot_time = '2026-01-21 00:00:00'
ORDER BY new_time_ms DESC;
```

## Building a Monitoring Dashboard

### Query Performance Summary

```sql
SELECT
    count(*) AS total_queries,
    sum(calls) AS total_calls,
    round(sum(total_exec_time)::numeric / 1000, 2) AS total_time_seconds,
    round(avg(mean_exec_time)::numeric, 2) AS avg_query_time_ms,
    round(
        100.0 * sum(shared_blks_hit) / nullif(sum(shared_blks_hit + shared_blks_read), 0),
        2
    ) AS overall_cache_hit_ratio
FROM pg_stat_statements;
```

### Database Health Report

```sql
WITH stats AS (
    SELECT
        sum(calls) AS total_calls,
        sum(total_exec_time) AS total_time,
        sum(rows) AS total_rows,
        sum(shared_blks_hit) AS total_hits,
        sum(shared_blks_read) AS total_reads
    FROM pg_stat_statements
)
SELECT
    'Total Queries Executed' AS metric,
    total_calls::text AS value
FROM stats
UNION ALL
SELECT
    'Total Execution Time',
    round((total_time / 1000)::numeric, 2)::text || ' seconds'
FROM stats
UNION ALL
SELECT
    'Average Rows per Query',
    round((total_rows::numeric / nullif(total_calls, 0)), 2)::text
FROM stats
UNION ALL
SELECT
    'Cache Hit Ratio',
    round(100.0 * total_hits / nullif(total_hits + total_reads, 0), 2)::text || '%'
FROM stats;
```

## Integrating with Monitoring Tools

### Prometheus Exporter Query

```sql
-- Expose metrics for Prometheus
SELECT
    'pg_stat_statements_calls_total{query="' ||
    replace(substring(query, 1, 50), '"', '\"') ||
    '"}' AS metric_name,
    calls AS metric_value
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 100;
```

### Grafana Dashboard Queries

```sql
-- Time series: Query execution time over snapshots
SELECT
    snapshot_time AS time,
    query,
    total_exec_time - lag(total_exec_time) OVER (PARTITION BY queryid ORDER BY snapshot_time) AS exec_time_delta
FROM pg_stat_statements_history
WHERE snapshot_time > now() - interval '24 hours';
```

## Practical Optimization Workflow

1. **Identify the Problem**

```sql
-- Find queries taking more than 100ms on average
SELECT queryid, substring(query, 1, 100), mean_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY total_exec_time DESC;
```

2. **Get the Full Query**

```sql
SELECT query FROM pg_stat_statements WHERE queryid = 123456789;
```

3. **Analyze with EXPLAIN**

```sql
-- Replace $1, $2 with actual values
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE customer_id = 42 AND status = 'pending';
```

4. **Apply Fix and Monitor**

```sql
-- After adding an index, reset stats
SELECT pg_stat_statements_reset();

-- Wait for traffic, then check improvement
SELECT mean_exec_time FROM pg_stat_statements WHERE queryid = 123456789;
```

---

pg_stat_statements is your window into PostgreSQL performance. Enable it on every database, review the top queries weekly, and use the data to prioritize optimization efforts. The queries consuming the most total time give you the biggest return on optimization investment.

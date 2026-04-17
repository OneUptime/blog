# How to Audit and Optimize ClickHouse Resource Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Resource Audit, Performance, Optimization, System Table

Description: Audit ClickHouse CPU, memory, disk, and query resource consumption using system tables, then apply targeted optimizations to reduce waste.

---

## Start with a System-Wide Audit

ClickHouse's `system` database contains a wealth of tables for auditing resource usage. Start with a high-level overview:

```sql
-- Overall server metrics
SELECT
    metric,
    value
FROM system.metrics
WHERE metric IN (
    'Query', 'BackgroundMergesAndMutationsPoolTask', 'MemoryTracking',
    'OpenFileForRead', 'OpenFileForWrite'
)
ORDER BY metric;
```

```sql
-- Recent resource usage summary
SELECT
    toStartOfHour(event_time) AS hour,
    count() AS query_count,
    sum(read_bytes) AS total_bytes_read,
    sum(memory_usage) AS total_memory_used,
    sum(query_duration_ms) AS total_query_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;
```

## Identify CPU Hogs

```sql
-- Top CPU consumers by user
SELECT
    user,
    count() AS query_count,
    sum(ProfileEvents['UserTimeMicroseconds']) / 1e6 AS total_cpu_sec,
    avg(ProfileEvents['UserTimeMicroseconds']) / 1e6 AS avg_cpu_sec
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY user
ORDER BY total_cpu_sec DESC;
```

If one user or query type dominates, consider adding a resource quota:

```sql
CREATE QUOTA analytics_quota
    FOR INTERVAL 1 HOUR MAX execution_time = 3600
    TO analytics_user;
```

## Find Memory-Wasteful Queries

```sql
SELECT
    query_id,
    left(query, 100) AS query_preview,
    formatReadableSize(memory_usage) AS memory_used,
    query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY memory_usage DESC
LIMIT 10;
```

For queries using excessive memory, check if they are doing large GROUP BY or JOIN operations without proper ORDER BY alignment:

```sql
-- Check if ORDER BY matches the query filter pattern
EXPLAIN SELECT user_id, count() FROM events WHERE date = today() GROUP BY user_id;
```

## Disk Usage Audit

```sql
-- Disk usage by database and table
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS on_disk,
    sum(rows) AS total_rows,
    count() AS part_count
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 20;
```

```sql
-- Find tables with poor compression (candidates for codec tuning)
SELECT
    table,
    column,
    type,
    round(data_uncompressed_bytes / nullIf(data_compressed_bytes, 0), 2) AS compression_ratio
FROM system.columns
WHERE compression_ratio < 2
  AND data_uncompressed_bytes > 1e8
ORDER BY compression_ratio;
```

## Background Task Audit

```sql
-- Check merge backlog
SELECT
    database,
    table,
    count() AS pending_merges,
    sum(rows_read) AS rows_to_merge
FROM system.merges
GROUP BY database, table;
```

A large merge backlog indicates insert throughput exceeds merge capacity. Consider reducing `max_insert_block_size` or increasing `background_pool_size`.

```xml
<!-- config.xml -->
<background_pool_size>16</background_pool_size>
<background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>
```

## Summary

Auditing ClickHouse resource usage through system tables reveals the exact queries, users, and tables consuming the most CPU, memory, and disk. Use these findings to apply targeted optimizations: resource quotas for heavy users, codec tuning for poorly-compressed columns, and background pool tuning for merge-lagging workloads.

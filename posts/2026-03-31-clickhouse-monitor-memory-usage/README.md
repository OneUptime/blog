# How to Monitor ClickHouse Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Monitoring, Performance, Administration, System Table

Description: Learn how to monitor ClickHouse memory usage at the server, query, and component level using system tables and configure memory limits to prevent out-of-memory crashes.

---

Memory is ClickHouse's most critical resource. A single large analytical query can consume gigabytes for hash tables during GROUP BY operations or sort buffers. Without proper monitoring and limits, one runaway query can exhaust available RAM and cause the server to crash or start swapping. This guide covers how to track memory usage in real time and how to configure limits at every level.

## Understanding ClickHouse Memory Accounting

ClickHouse tracks memory at multiple levels:

- **MemoryTracking**: total tracked memory across all queries and internal components
- **Resident memory (RSS)**: actual physical memory used by the process as seen by the OS
- **Per-query memory**: tracked for each running query
- **Per-server limits**: hard ceiling configured in `config.xml`

## Checking Current Memory Usage

Use `system.asynchronous_metrics` for the OS-level view:

```sql
SELECT
    metric,
    formatReadableSize(toUInt64(value)) AS human,
    value
FROM system.asynchronous_metrics
WHERE metric LIKE '%Memory%'
ORDER BY metric;
```

Key metrics to watch:

| Metric | Description |
|---|---|
| `MemoryResident` | Resident set size (RSS) from the OS |
| `MemoryVirtual` | Virtual address space (usually much larger) |
| `MemoryShared` | Shared memory pages |
| `MemoryCode` | Memory used by code segments |
| `MemoryDataAndStack` | Stack and heap memory |

Check live memory gauges from `system.metrics`:

```sql
SELECT metric, value, description
FROM system.metrics
WHERE metric IN (
    'MemoryTracking',
    'MergesMutationsMemoryTracking',
    'MarkCacheBytes',
    'UncompressedCacheBytes',
    'CompiledExpressionCacheBytes'
);
```

## Memory Usage by Currently Running Query

Find which queries are consuming the most memory right now:

```sql
SELECT
    query_id,
    user,
    elapsed,
    formatReadableSize(memory_usage)      AS memory_usage,
    formatReadableSize(peak_memory_usage) AS peak_memory,
    read_rows,
    formatReadableSize(read_bytes)        AS read_bytes,
    substr(query, 1, 120)                 AS query_preview
FROM system.processes
ORDER BY memory_usage DESC;
```

## Historical Memory Usage from query_log

Analyze memory consumption trends from historical query data:

```sql
-- Top memory-consuming queries in the last 24 hours
SELECT
    query_id,
    user,
    event_time,
    formatReadableSize(memory_usage)      AS mem_used,
    formatReadableSize(peak_memory_usage) AS peak_mem,
    query_duration_ms,
    substr(query, 1, 150)                 AS query
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 24 HOUR
    AND is_initial_query = 1
ORDER BY peak_memory_usage DESC
LIMIT 20;

-- Average peak memory by user
SELECT
    user,
    count()                               AS query_count,
    formatReadableSize(avg(peak_memory_usage)) AS avg_peak_mem,
    formatReadableSize(max(peak_memory_usage)) AS max_peak_mem
FROM system.query_log
WHERE
    type = 'QueryFinish'
    AND event_time >= now() - INTERVAL 24 HOUR
    AND is_initial_query = 1
GROUP BY user
ORDER BY max(peak_memory_usage) DESC;
```

## Cache Memory Usage

ClickHouse maintains several in-memory caches. Monitor their sizes:

```sql
-- Mark cache (stores index marks for data part files)
SELECT
    metric,
    formatReadableSize(value) AS size
FROM system.metrics
WHERE metric IN (
    'MarkCacheBytes',
    'MarkCacheFiles',
    'UncompressedCacheBytes',
    'UncompressedCacheCells',
    'CompiledExpressionCacheBytes',
    'CompiledExpressionCacheCount',
    'QueryCacheBytes',
    'QueryCacheEntries'
);
```

## Tracking Memory Over Time

Create a memory history table and populate it every minute:

```sql
CREATE TABLE memory_usage_history
(
    snapshot_time       DateTime DEFAULT now(),
    host                String DEFAULT hostName(),
    resident_mb         Float64,
    tracked_mb          Float64,
    mark_cache_mb       Float64,
    uncompressed_cache_mb Float64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(snapshot_time)
ORDER BY (host, snapshot_time)
TTL snapshot_time + INTERVAL 30 DAY;
```

```bash
#!/bin/bash
# /usr/local/bin/record-memory.sh
clickhouse-client --query "
INSERT INTO memory_usage_history
    (resident_mb, tracked_mb, mark_cache_mb, uncompressed_cache_mb)
SELECT
    (SELECT value FROM system.asynchronous_metrics WHERE metric = 'MemoryResident') / 1048576,
    (SELECT value FROM system.metrics WHERE metric = 'MemoryTracking') / 1048576,
    (SELECT value FROM system.metrics WHERE metric = 'MarkCacheBytes') / 1048576,
    (SELECT value FROM system.metrics WHERE metric = 'UncompressedCacheBytes') / 1048576
"
```

```bash
# Add to crontab
* * * * * /usr/local/bin/record-memory.sh
```

## Configuring Server-Level Memory Limits

Set the maximum memory the server is allowed to use for all queries combined:

```bash
sudo tee /etc/clickhouse-server/config.d/memory-limits.xml > /dev/null <<'EOF'
<clickhouse>
    <!-- Maximum memory for all queries combined (in bytes) -->
    <!-- Set to ~80% of total RAM -->
    <max_server_memory_usage>32212254720</max_server_memory_usage>

    <!-- Soft limit: start rejecting new queries when this fraction is used -->
    <max_server_memory_usage_to_ram_ratio>0.8</max_server_memory_usage_to_ram_ratio>

    <!-- Mark cache size (default 5GB) -->
    <mark_cache_size>5368709120</mark_cache_size>

    <!-- Uncompressed data cache size (default 0, disabled) -->
    <uncompressed_cache_size>8589934592</uncompressed_cache_size>
</clickhouse>
EOF
```

## Configuring Per-Query Memory Limits

Apply per-query limits via settings profiles:

```sql
-- Create a profile with memory limits
CREATE SETTINGS PROFILE memory_safe
    SETTINGS
        max_memory_usage                   = 8589934592,  -- 8 GB per query
        max_memory_usage_for_user          = 17179869184, -- 16 GB total per user
        memory_overcommit_ratio_denominator = 1073741824, -- 1 GB denominator
        memory_usage_overcommit_max_wait_microseconds = 5000000; -- 5 second wait

ALTER USER analyst_user SETTINGS PROFILE 'memory_safe';
```

Set the limit for a specific query at session level:

```sql
SET max_memory_usage = 4294967296; -- 4 GB for this session

SELECT
    user_id,
    count(),
    uniqExact(session_id)
FROM events
WHERE event_date >= today() - 30
GROUP BY user_id
ORDER BY count() DESC
LIMIT 100;
```

## Diagnosing Memory OOM Events

When a query is killed by the memory limiter, the event appears in `system.query_log`:

```sql
SELECT
    event_time,
    query_id,
    user,
    exception_code,
    exception,
    formatReadableSize(memory_usage)      AS mem_at_failure,
    formatReadableSize(peak_memory_usage) AS peak_mem,
    query
FROM system.query_log
WHERE
    type = 'ExceptionWhileProcessing'
    AND exception LIKE '%Memory%'
    AND event_time >= now() - INTERVAL 7 DAY
ORDER BY event_time DESC
LIMIT 20;
```

## Memory-Efficient Query Patterns

Reduce per-query memory by rewriting queries:

```sql
-- High memory: uniqExact scans all values
SELECT user_id, uniqExact(session_id) AS exact_sessions
FROM events
GROUP BY user_id;

-- Lower memory: uniq uses a compact approximate-distinct algorithm
SELECT user_id, uniq(session_id) AS approx_sessions
FROM events
GROUP BY user_id;

-- Avoid SELECT * on wide tables
-- High memory
SELECT * FROM large_table WHERE condition;

-- Lower memory: select only needed columns
SELECT id, name, value FROM large_table WHERE condition;
```

## Summary

Monitoring ClickHouse memory requires watching three levels: OS-level RSS from `system.asynchronous_metrics`, live tracked memory from `system.metrics`, and per-query peak usage from `system.processes` and `system.query_log`. Configure `max_server_memory_usage` in `config.xml` to prevent the process from exhausting system RAM, use settings profiles to enforce per-user and per-query limits, and watch for OOM exceptions in `query_log` to find the queries that need to be rewritten or rate-limited.

# How to Fix 'Cannot allocate memory' Errors in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Troubleshooting, Out of Memory, Configuration

Description: Fix ClickHouse 'Cannot allocate memory' errors by diagnosing memory limits, identifying heavy queries, and tuning memory settings to match your workload.

---

## Overview

ClickHouse throws "Cannot allocate memory" errors when a query or operation exceeds the configured memory limit. This can occur at the query level (`max_memory_usage`), server level (`max_server_memory_usage`), or at the OS level when the system runs out of physical RAM. Understanding which layer is triggering the error is the first step to resolution.

## Identifying the Error Source

Check recent errors in the query log:

```sql
SELECT
    event_time,
    user,
    exception,
    substring(query, 1, 200) AS query_preview
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
    AND exception LIKE '%Cannot allocate memory%'
    AND event_date >= today() - 1
ORDER BY event_time DESC
LIMIT 20;
```

## Check Current Memory Usage

```sql
-- Current server memory usage
SELECT
    metric,
    value / 1073741824 AS value_gb
FROM system.metrics
WHERE metric IN ('MemoryTracking', 'MergesMutationsMemoryTracking');

-- Memory per query
SELECT
    query_id,
    user,
    memory_usage / 1073741824 AS memory_gb,
    peak_memory_usage / 1073741824 AS peak_memory_gb,
    substring(query, 1, 100) AS query_preview
FROM system.processes
ORDER BY memory_usage DESC;
```

## Raise the Query Memory Limit

If the query legitimately needs more memory, raise `max_memory_usage`:

```sql
-- Per query
SELECT ...
SETTINGS max_memory_usage = 20000000000;  -- 20 GB

-- Per session
SET max_memory_usage = 20000000000;
```

Update in user profile for permanent change:

```xml
<profiles>
    <analyst>
        <max_memory_usage>20000000000</max_memory_usage>
    </analyst>
</profiles>
```

## Raise the Server Memory Limit

```xml
<!-- /etc/clickhouse-server/config.d/memory.xml -->
<clickhouse>
    <max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>
</clickhouse>
```

This allows ClickHouse to use 90% of available RAM.

## Enable Memory Spilling to Disk

For aggregations and sorts, allow ClickHouse to spill to disk:

```sql
SELECT user_id, count() AS events, sum(revenue) AS total
FROM large_events
GROUP BY user_id
ORDER BY total DESC
SETTINGS
    max_bytes_before_external_group_by = 10000000000,  -- 10 GB before spill
    max_bytes_before_external_sort = 10000000000;
```

## Reduce Memory Footprint

For large GROUP BY queries, tune memory settings:

```sql
SELECT user_id, count()
FROM billion_row_table
GROUP BY user_id
SETTINGS
    group_by_two_level_threshold = 100000,
    group_by_two_level_threshold_bytes = 100000000,
    max_threads = 4;  -- fewer threads = less parallel memory usage
```

## Identify Memory-Hungry Merges

Background merges can also consume significant memory:

```sql
SELECT
    database,
    table,
    elapsed,
    progress,
    num_parts,
    result_part_name
FROM system.merges
ORDER BY memory_usage DESC;
```

Limit merge memory:

```xml
<clickhouse>
    <merge_tree>
        <max_bytes_to_merge_at_max_space_in_pool>10737418240</max_bytes_to_merge_at_max_space_in_pool>
    </merge_tree>
</clickhouse>
```

## Fix OS-Level Memory Exhaustion

If the OS is out of memory (OOM), check system logs:

```bash
sudo dmesg | grep -i "oom\|out of memory" | tail -20
sudo journalctl -k | grep -i "killed process" | tail -10
```

Consider adding swap space as a safety net:

```bash
sudo fallocate -l 32G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Reduce Uncompressed Cache Size

The uncompressed cache can consume significant RAM:

```xml
<clickhouse>
    <uncompressed_cache_size>4294967296</uncompressed_cache_size>  <!-- 4 GB -->
</clickhouse>
```

## Summary

"Cannot allocate memory" in ClickHouse occurs when queries exceed `max_memory_usage` (per-query limit), `max_server_memory_usage` (server-wide limit), or the OS runs out of physical RAM. Fix it by identifying the heaviest queries via `system.processes`, raising memory limits for legitimate large queries, enabling disk spilling with `max_bytes_before_external_group_by`, and monitoring background merges. Always leave at least 10-20% of RAM for the OS and other processes.

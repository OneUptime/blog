# How to Estimate ClickHouse Memory Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Memory, Capacity Planning, Performance, Infrastructure

Description: Estimate ClickHouse RAM requirements by sizing the mark cache, query memory, and OS page cache based on your data volume and concurrency needs.

---

ClickHouse uses memory for three primary purposes: the mark cache (index lookups), query execution buffers, and the OS page cache for hot data. Sizing each correctly prevents OOM kills while avoiding waste.

## Component Breakdown

### 1. Mark Cache

The mark cache stores sparse index marks that locate data in parts. As a rule of thumb, it is roughly 0.5-1% of compressed data size:

```text
Compressed data: 500 GB
Mark cache estimate: 500 GB * 0.01 = 5 GB
```

Set it explicitly:

```xml
<mark_cache_size>5368709120</mark_cache_size>  <!-- 5 GB in bytes -->
```

### 2. Query Memory

Each concurrent query can use memory for joins, aggregations, and sort buffers. Inspect actual usage:

```sql
SELECT
    query_id,
    peak_memory_usage,
    read_rows,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY peak_memory_usage DESC
LIMIT 10;
```

Budget 1-4 GB per concurrent analytical query:

```text
Max concurrent analytical queries: 10
Per-query budget: 2 GB
Query memory total: 20 GB
```

### 3. OS Page Cache

Linux uses free RAM as page cache. ClickHouse benefits from frequently accessed parts staying in cache. Reserve 10-20% of data size:

```text
Hot data (last 7 days compressed): 60 GB
Page cache target: 60 GB * 0.15 = 9 GB
```

## Total RAM Formula

```text
Total RAM = mark_cache + query_memory + page_cache + 4 GB OS overhead
          = 5 + 20 + 9 + 4 = 38 GB  =>  choose 64 GB node
```

## Setting Memory Limits

```xml
<max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>
<max_memory_usage>10000000000</max_memory_usage>  <!-- per-query limit: 10 GB -->
```

## Monitoring Memory

```sql
SELECT metric, value
FROM system.metrics
WHERE metric = 'MemoryTracking'
UNION ALL
SELECT metric, value
FROM system.asynchronous_metrics
WHERE metric IN ('MarkCacheBytes', 'UncompressedCacheBytes');
```

Track these metrics in [OneUptime](https://oneuptime.com) and alert when `MemoryTracking` exceeds 80% of available RAM.

## Summary

Size ClickHouse memory by summing mark cache, per-query budgets multiplied by concurrency, and a page cache allowance. Set server and per-query memory limits to prevent any single query from causing an OOM condition.

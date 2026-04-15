# How to Reduce ClickHouse Memory Usage for Large Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, Infrastructure, Database, Analytics

Description: Learn how to reduce ClickHouse memory consumption for large queries using external aggregation, streaming joins, query settings, and schema optimizations.

## Introduction

ClickHouse processes analytical queries in memory for maximum speed. However, very large GROUP BY operations, high-cardinality JOINs, and wide SELECT projections can exhaust available RAM, causing queries to fail with "Memory limit exceeded" errors or degrading the performance of other concurrent queries. This guide covers diagnosis, prevention, and practical techniques to reduce memory usage for large queries.

## Diagnosing Memory Usage

Before optimizing, measure how much memory your queries are consuming.

```sql
-- Top queries by peak memory usage in the last hour
SELECT
    left(query, 100)               AS query_snippet,
    memory_usage,
    formatReadableSize(memory_usage) AS readable_memory,
    query_duration_ms,
    read_rows,
    read_bytes
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
ORDER BY memory_usage DESC
LIMIT 10;

-- Currently running queries with memory usage
SELECT
    query_id,
    left(query, 80)  AS query,
    elapsed,
    formatReadableSize(memory_usage) AS memory_used,
    read_rows
FROM system.processes
ORDER BY memory_usage DESC;
```

## Setting Memory Limits

The first step is enforcing per-query memory limits so one heavy query does not crash the server.

```sql
-- Set a 10 GB limit for the current session
SET max_memory_usage = 10000000000;

-- Or set at server level via users.xml
-- This applies to all queries by default
```

```xml
<!-- /etc/clickhouse-server/users.xml -->
<profiles>
    <default>
        <max_memory_usage>10000000000</max_memory_usage>
        <max_memory_usage_for_user>50000000000</max_memory_usage_for_user>
    </default>
</profiles>
```

## External Aggregation (Spill to Disk)

When a GROUP BY produces more groups than fit in RAM, enable external aggregation to spill intermediate results to disk.

```sql
-- Allow up to 20 GB for aggregation before spilling to disk
SET max_bytes_before_external_group_by = 20000000000;

-- Run a high-cardinality aggregation
SELECT
    user_id,
    count()     AS events,
    sum(value)  AS total_value
FROM user_events
GROUP BY user_id
SETTINGS max_bytes_before_external_group_by = 20000000000;
```

ClickHouse writes partial aggregation states to `/var/lib/clickhouse/tmp/` when the in-memory size exceeds the threshold. Set the tmp directory to a disk with sufficient free space.

```xml
<!-- Ensure tmp directory is on a disk with enough space -->
<tmp_path>/var/lib/clickhouse/tmp/</tmp_path>
```

## External Sort (Spill to Disk)

Large ORDER BY operations can also spill to disk:

```sql
-- Allow up to 10 GB for sorting before spilling
SET max_bytes_before_external_sort = 10000000000;

SELECT *
FROM large_table
ORDER BY event_time DESC
LIMIT 1000
SETTINGS max_bytes_before_external_sort = 10000000000;
```

## Reduce Memory for JOINs

JOINs load the right-hand table into a hash table in memory. Use these strategies to reduce JOIN memory.

```sql
-- Strategy 1: Use grace hash join to spill to disk
SELECT e.user_id, u.plan
FROM user_events e
JOIN users u ON e.user_id = u.user_id
SETTINGS
    join_algorithm = 'grace_hash',
    grace_hash_join_initial_buckets = 16,
    max_bytes_in_join = 5000000000;

-- Strategy 2: Replace JOIN with a dictionary lookup
-- Dictionaries are loaded once and shared across queries (much less per-query overhead)
SELECT
    user_id,
    dictGet('user_dict', 'plan', user_id) AS plan
FROM user_events;

-- Strategy 3: Pre-filter the right side before joining
SELECT e.user_id, u.plan
FROM user_events e
JOIN (
    SELECT user_id, plan
    FROM users
    WHERE plan = 'enterprise'
    LIMIT 100000
) u ON e.user_id = u.user_id;
```

## Use Streaming Aggregation

When your data is sorted by the GROUP BY key and the GROUP BY key matches the primary key order, ClickHouse can aggregate in streaming mode without building a hash table.

```sql
-- Table ordered by (event_date, service)
-- This query groups by (event_date, service) which matches the ORDER BY
-- ClickHouse streams through the data and aggregates in order: O(1) memory
SELECT
    event_date,
    service,
    count() AS events
FROM metrics_ordered_by_date_service
GROUP BY event_date, service
ORDER BY event_date, service
SETTINGS optimize_aggregation_in_order = 1;
```

Check whether in-order aggregation was used:

```sql
EXPLAIN PIPELINE
SELECT event_date, service, count()
FROM metrics_ordered_by_date_service
GROUP BY event_date, service
SETTINGS optimize_aggregation_in_order = 1;
-- Look for "AggregatingInOrderTransform" in the output to confirm in-order mode
```

## Reduce Column Width

Wide tables with many large string columns consume significant memory during aggregations and projections. Apply these schema techniques:

```sql
-- Use LowCardinality for repeated string values (reduces memory by 10-50x for these columns)
-- Before:
ALTER TABLE events MODIFY COLUMN service String;
-- After:
ALTER TABLE events MODIFY COLUMN service LowCardinality(String);

-- Use FixedString for fixed-length values instead of String
-- Before: country_code String (heap-allocated, variable overhead)
-- After: country_code FixedString(2)  (no heap allocation, 2 bytes per row)
ALTER TABLE events MODIFY COLUMN country_code FixedString(2);

-- Use Nullable sparingly: Nullable adds a bitmask column and prevents many optimizations
-- Avoid: user_id Nullable(UInt64)
-- Prefer: user_id UInt64 DEFAULT 0
```

## Limit Read Width with Column Projection

Only select columns you need. ClickHouse is columnar - unused columns are never read.

```sql
-- Bad: reads all columns including large String columns
SELECT * FROM events WHERE event_time >= today() - 7;

-- Good: reads only the three needed columns
SELECT event_id, service, event_time
FROM events
WHERE event_time >= today() - 7;
```

## Use SAMPLE to Reduce Memory for Approximate Queries

For queries where approximate results are acceptable, sample a fraction of the data. Note that the table must have a `SAMPLE BY` expression defined in the table engine for SAMPLE to work.

```sql
-- Process 10% of rows: uses 10x less memory and is 10x faster
SELECT
    service,
    count() * 10       AS estimated_events,
    avg(value)         AS avg_value
FROM metrics
SAMPLE 0.1
GROUP BY service
ORDER BY estimated_events DESC;
```

## Monitor Memory Trends

Set up ongoing monitoring for memory pressure:

```sql
-- Memory usage over time per query type
SELECT
    toStartOfMinute(event_time)          AS minute,
    count()                              AS queries,
    formatReadableSize(avg(memory_usage)) AS avg_memory,
    formatReadableSize(max(memory_usage)) AS peak_memory
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;

-- Queries that hit memory limits
SELECT
    event_time,
    left(query, 100) AS query,
    exception
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
  AND exception LIKE '%Memory%'
ORDER BY event_time DESC
LIMIT 20;
```

## Summary

Reducing ClickHouse memory usage for large queries combines query-level techniques (external aggregation and sort spill, `SAMPLE`, column selection) with schema improvements (`LowCardinality`, `FixedString`, avoiding `Nullable`) and algorithm choices (in-order aggregation for sorted data, dictionary lookups instead of joins, grace hash joins for large right-hand tables). Use `system.query_log.memory_usage` and `system.processes` to continuously measure peak memory and target the heaviest queries first.

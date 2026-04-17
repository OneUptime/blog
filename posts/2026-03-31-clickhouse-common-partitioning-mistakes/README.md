# Common ClickHouse Partitioning Mistakes and How to Fix Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Partitioning, Mistakes, Best Practice, MergeTree

Description: Learn the most common ClickHouse partitioning mistakes - over-partitioning, wrong partition keys, and partition anti-patterns - and how to fix them.

---

ClickHouse partitioning organizes data into separate directories on disk, enabling efficient data lifecycle management and partition-level operations. Mistakes in partitioning strategy cause poor performance, excessive small parts, and slow merges.

## Mistake 1: Over-Partitioning (Too Many Partitions)

The most common mistake is partitioning at too fine a granularity.

```sql
-- BAD: hourly partitioning creates 720+ partitions per month
PARTITION BY toStartOfHour(event_time)

-- BAD: daily partitioning creates 365 partitions per year
PARTITION BY toDate(event_time)  -- only appropriate for 100GB+/day tables

-- GOOD: monthly partitioning for most workloads
PARTITION BY toYYYYMM(event_time)
```

When you have too many partitions, ClickHouse must open many files and maintain metadata for each, degrading INSERT and SELECT performance.

```sql
-- Check current partition count per table
SELECT
    table,
    uniqExact(partition) AS partition_count,
    count() AS part_count,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS total_size
FROM system.parts
WHERE active = 1
GROUP BY table
ORDER BY partition_count DESC;
```

## Mistake 2: Partitioning by High-Cardinality Columns

Partitioning by user_id, UUID, or any high-cardinality column creates millions of tiny partitions.

```sql
-- BAD: creates one partition per user (millions of partitions)
PARTITION BY user_id

-- GOOD: partition by time for natural data lifecycle management
PARTITION BY toYYYYMM(event_time)
```

## Mistake 3: Partition Key Not Matching TTL Expressions

TTL operations work at the partition level. If your TTL expression does not align with your partition key, ClickHouse cannot drop entire partitions efficiently.

```sql
-- BAD: TTL and partition key use different time expressions
PARTITION BY toYYYYMM(event_time)
TTL toDate(event_time) + INTERVAL 90 DAY DELETE;

-- GOOD: consistent time expressions for efficient partition drops
PARTITION BY toYYYYMM(event_time)
TTL event_time + INTERVAL 90 DAY DELETE;
```

## Mistake 4: Forgetting to Use Partition Pruning in Queries

Even with correct partitioning, queries that do not filter on the partition key will scan all partitions.

```sql
-- Table partitioned by toYYYYMM(event_time)

-- BAD: no time filter, scans all partitions
SELECT count() FROM events WHERE user_id = 42;

-- GOOD: partition pruning reduces scan scope
SELECT count() FROM events
WHERE toYYYYMM(event_time) IN (202401, 202402, 202403)
  AND user_id = 42;
```

## Mistake 5: Using ALTER TABLE DROP PARTITION Incorrectly

Dropping the wrong partition permanently deletes data with no undo.

```sql
-- ALWAYS verify the partition name before dropping
SELECT partition, rows, bytes_on_disk
FROM system.parts
WHERE table = 'events' AND active = 1
ORDER BY partition;

-- Drop a specific partition (after verifying)
ALTER TABLE events DROP PARTITION ID '202401';
```

## Mistake 6: Expecting Partitions to Replace ORDER BY for Filtering

Partitions are for data lifecycle management, not query acceleration within a time range. The ORDER BY (sorting key) is what accelerates point queries.

```sql
-- Partitions skip months, but within a month ORDER BY skips granules
-- Both are needed:
CREATE TABLE events (
    event_time DateTime,
    country LowCardinality(String),
    user_id UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)    -- lifecycle management
ORDER BY (country, user_id, event_time);  -- query acceleration
```

## Summary

The most important ClickHouse partitioning rule is: use monthly partitioning for almost everything, never partition by high-cardinality columns, and keep the partition key aligned with TTL expressions. Partitioning is primarily a data lifecycle tool, not a performance optimization - that is what the sorting key is for.

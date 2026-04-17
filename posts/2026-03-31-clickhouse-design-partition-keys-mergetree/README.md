# How to Design Partition Keys for MergeTree Tables in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Partition Key, MergeTree, Schema Design, Performance, Data Management

Description: Learn how to choose and design effective partition keys for ClickHouse MergeTree tables to optimize query performance and data lifecycle management.

---

## What Is a Partition Key?

A partition key in ClickHouse determines how data parts are grouped on disk. When you write data, ClickHouse places rows into separate parts based on the partition key value. This enables:

- **Partition pruning** - queries skip entire partitions that don't match the filter
- **TTL operations** - drop or move whole partitions efficiently
- **Data lifecycle management** - detach, attach, and move partitions by value

## Defining a Partition Key

```sql
CREATE TABLE events (
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    revenue     Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);
```

Here `toYYYYMM(event_time)` creates one partition per month.

## Common Partition Key Patterns

### Time-based partitioning (most common)

```sql
-- Monthly
PARTITION BY toYYYYMM(event_time)

-- Daily (for high-volume tables)
PARTITION BY toDate(event_time)

-- Yearly (for low-volume tables)
PARTITION BY toYear(event_time)
```

### Composite partition keys

```sql
-- Region + Month
PARTITION BY (region, toYYYYMM(event_time))
```

### Tenant-based partitioning

```sql
-- For multi-tenant SaaS analytics
PARTITION BY tenant_id
```

## The Danger of Too Many Partitions

Each partition generates multiple data parts on disk. Too many partitions means too many parts, which causes:

- Memory pressure from part metadata
- Slower merges
- The `Too many parts` error that halts inserts

A good rule of thumb: keep total active parts below 1000 per table. Monitor with:

```sql
SELECT
    partition,
    count() AS parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size
FROM system.parts
WHERE table = 'events'
  AND active = 1
GROUP BY partition
ORDER BY partition DESC
LIMIT 20;
```

## Partition Key vs. Ordering Key

These serve different purposes:

| Property | Partition Key | Ordering Key (ORDER BY) |
|---|---|---|
| Purpose | Physical grouping on disk | Row sort order within a part |
| Affects | Partition pruning | Primary index, point lookups |
| Granularity | Coarse (months, days) | Fine (per granule, 8192 rows) |

The ordering key is usually far more impactful for query speed. The partition key primarily helps with data management.

## Using Partitions for TTL

```sql
ALTER TABLE events
    MODIFY TTL event_time + INTERVAL 90 DAY DELETE;
```

ClickHouse drops entire partitions when all their rows are expired, which is far more efficient than row-level deletes.

## Moving Partitions Between Tables

```sql
-- Move a month of data to an archive table
-- Partition ID for toYYYYMM(event_time) in Jan 2024 is 202401
ALTER TABLE events
    MOVE PARTITION 202401
    TO TABLE events_archive;
```

## Avoid These Partition Anti-Patterns

- Do not partition by a high-cardinality column like `user_id` or `uuid` - this creates millions of partitions
- Do not use sub-daily partitions unless you ingest millions of rows per hour
- Do not omit a partition key entirely if you plan to use TTL - TTL on unpartitioned tables uses mutations, which are slow

## Summary

Partition keys in ClickHouse MergeTree tables control physical data grouping for pruning and lifecycle management. Use time-based keys (monthly or daily) for event data, keep partition counts manageable, and remember that the ordering key does more work for query speed. Design partitions around your data retention and management needs, not purely query patterns.

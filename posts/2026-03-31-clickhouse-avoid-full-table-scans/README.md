# How to Avoid Full Table Scans in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Optimization, Primary Key, Skip Index, Partition, Performance

Description: Learn how to avoid costly full table scans in ClickHouse by using primary keys, skip indexes, and partition pruning effectively.

---

Full table scans in ClickHouse read every row on disk, which destroys query performance at scale. ClickHouse uses a sparse primary index and data parts to skip large swaths of data - but only if your queries are designed to use them.

## Understanding the Sparse Primary Index

ClickHouse stores one index entry per granule (default 8192 rows). When you query by a primary key column, ClickHouse uses binary search over the index to identify which granules to read. If your WHERE clause does not filter on the primary key prefix, ClickHouse must scan every granule.

```sql
-- Table ordered by (tenant_id, event_time)
CREATE TABLE events (
    tenant_id  UInt32,
    event_time DateTime,
    event_type String,
    payload    String
) ENGINE = MergeTree()
ORDER BY (tenant_id, event_time);
```

A query filtering only on `tenant_id` will use the index. A query filtering only on `event_type` will not - it must scan all granules.

## Use EXPLAIN to Detect Full Scans

```sql
EXPLAIN indexes = 1
SELECT count()
FROM events
WHERE event_type = 'click';
```

Look for `Granules: N/N` in the output. If all granules are selected, you have a full scan.

## Partition Pruning

Add a partition key to skip entire data parts:

```sql
CREATE TABLE events (
    tenant_id  UInt32,
    event_time DateTime,
    event_type String,
    payload    String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (tenant_id, event_time);
```

Queries filtered on `event_time` within a single month will only touch that partition's parts, skipping all others entirely.

## Skip Indexes for Low-Selectivity Columns

For columns not in the primary key, add a skip index:

```sql
ALTER TABLE events
ADD INDEX idx_event_type event_type TYPE set(100) GRANULARITY 4;

ALTER TABLE events MATERIALIZE INDEX idx_event_type;
```

```sql
-- Now this benefits from the skip index
SELECT count()
FROM events
WHERE event_type = 'purchase';
```

The `set(100)` index stores up to 100 unique values per granule group. If the queried value is absent from a granule group, ClickHouse skips it.

## Bloom Filter Indexes for String Columns

```sql
ALTER TABLE events
ADD INDEX idx_payload_search payload TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1;
```

Token bloom filters accelerate substring and token searches without reading all data.

## Query Rewriting Tips

- Always include the leading ORDER BY column in WHERE.
- Use `IN` with a small set rather than `LIKE '%...'` when possible.
- Avoid functions on primary key columns in WHERE: `toStartOfDay(event_time)` prevents index use; `event_time >= toStartOfDay(now())` does not.

```sql
-- Bad: function wraps the indexed column
SELECT count() FROM events WHERE toDate(event_time) = today();

-- Good: range filter on the raw column
SELECT count() FROM events WHERE event_time >= today() AND event_time < today() + INTERVAL 1 DAY;
```

## Summary

Avoiding full table scans in ClickHouse requires aligning your ORDER BY key with your most common filter patterns, using partition pruning for time-range queries, and adding skip indexes for secondary filter columns. Always verify with `EXPLAIN indexes = 1` before and after schema changes to confirm granule reduction.

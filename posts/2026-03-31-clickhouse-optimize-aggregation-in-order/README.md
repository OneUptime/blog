# How to Use optimize_aggregation_in_order in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Performance, Query, Aggregation, Configuration, optimize_aggregation_in_order

Description: Learn how to enable optimize_aggregation_in_order in ClickHouse to exploit table sort order for faster GROUP BY operations with lower memory usage.

---

ClickHouse's `optimize_aggregation_in_order` setting enables a specialized aggregation strategy that exploits the sorted order of MergeTree tables. When enabled, ClickHouse can aggregate data incrementally as it reads sorted blocks rather than accumulating all data in a hash table, dramatically reducing memory usage for certain query patterns.

## How It Works

MergeTree tables store data sorted by their `ORDER BY` key. When you GROUP BY a prefix of that key, ClickHouse can process each group completely before moving to the next one - because all rows for a group appear contiguously in sorted order. This eliminates the need to hold all groups in memory simultaneously.

```sql
-- Table with ORDER BY (tenant_id, event_date)
CREATE TABLE events (
    tenant_id UInt32,
    event_date Date,
    event_type String,
    count UInt64
)
ENGINE = MergeTree()
ORDER BY (tenant_id, event_date);
```

With this schema, a GROUP BY on `tenant_id` or `(tenant_id, event_date)` can use in-order aggregation.

## Enabling the Setting

```sql
-- Enable for session
SET optimize_aggregation_in_order = 1;

-- Enable for a specific query
SELECT tenant_id, sum(count)
FROM events
GROUP BY tenant_id
SETTINGS optimize_aggregation_in_order = 1;
```

The optimizer automatically determines whether in-order aggregation is applicable. If the GROUP BY key is not a prefix of the table's sort key, ClickHouse falls back to standard hash-based aggregation.

## Verifying the Optimization Was Applied

Use `EXPLAIN` to confirm the query plan uses in-order aggregation:

```sql
EXPLAIN pipeline
SELECT tenant_id, event_date, sum(count)
FROM events
GROUP BY tenant_id, event_date
SETTINGS optimize_aggregation_in_order = 1;
```

Look for `AggregatingInOrderTransform` in the output, which indicates the in-order aggregation path is being used instead of the standard `AggregatingTransform`.

## Memory Usage Comparison

```sql
-- Standard aggregation - loads all groups into hash table
SELECT tenant_id, sum(count) AS total
FROM events
GROUP BY tenant_id
SETTINGS optimize_aggregation_in_order = 0;

-- In-order aggregation - flushes each group as it finishes
SELECT tenant_id, sum(count) AS total
FROM events
GROUP BY tenant_id
SETTINGS optimize_aggregation_in_order = 1;
```

Monitor memory usage per query:

```sql
SELECT
    query_id,
    memory_usage,
    query_duration_ms,
    Settings['optimize_aggregation_in_order'] AS setting_value
FROM system.query_log
WHERE query LIKE '%GROUP BY tenant_id%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## When This Setting Helps Most

In-order aggregation provides the greatest benefit when:

1. The GROUP BY key matches or is a prefix of the table's `ORDER BY` key.
2. The number of distinct groups is large (millions of tenants, users, etc.).
3. Memory pressure is a concern - either from `max_memory_usage` limits or server-wide RAM constraints.

For low-cardinality GROUP BY keys (e.g., grouping by day of week), standard hash aggregation is typically faster.

## Combining with optimize_read_in_order

Both settings work together naturally:

```sql
SELECT tenant_id, event_date, sum(count)
FROM events
WHERE tenant_id BETWEEN 1000 AND 2000
GROUP BY tenant_id, event_date
ORDER BY tenant_id, event_date
SETTINGS
    optimize_read_in_order = 1,
    optimize_aggregation_in_order = 1;
```

This avoids both random reads and in-memory sort for GROUP BY + ORDER BY queries that align with the table's sort key.

## Summary

`optimize_aggregation_in_order` allows ClickHouse to aggregate MergeTree data incrementally by exploiting its sorted layout, reducing memory usage for high-cardinality GROUP BY queries that align with the table's `ORDER BY` key. Enable it globally or per query when memory pressure is a concern and the GROUP BY key matches the table's sort order prefix.

# Why You Should Avoid Unordered GROUP BY Keys in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, GROUP BY, Query Optimization, Performance, Aggregation

Description: Explains how aligning GROUP BY keys with the table's ORDER BY reduces memory usage and enables the group_by_use_nulls and two-level aggregation optimizations.

---

## GROUP BY and the Primary Key Relationship

ClickHouse stores data sorted by the `ORDER BY` (primary key) columns. When a `GROUP BY` uses a prefix of the ORDER BY, ClickHouse can use a streaming aggregation mode that processes data in order without building a full hash table. Misaligned GROUP BY keys force a full hash-based aggregation, which uses more memory and CPU.

## Example: Aligned vs Misaligned

```sql
-- Table definition
CREATE TABLE events (
  user_id    UInt64,
  event_type String,
  event_time DateTime,
  amount     Decimal(12,2)
) ENGINE = MergeTree()
ORDER BY (user_id, event_time);

-- EFFICIENT: GROUP BY prefix of ORDER BY
SELECT user_id, sum(amount) AS total
FROM events
WHERE event_time >= today()
GROUP BY user_id;

-- LESS EFFICIENT: GROUP BY non-prefix key
SELECT event_type, count() AS cnt
FROM events
WHERE event_time >= today()
GROUP BY event_type;
```

The second query must read all rows and build a hash table keyed on `event_type`. The first can take advantage of the sorted order.

## Checking Aggregation Mode in EXPLAIN

```sql
EXPLAIN PIPELINE
SELECT user_id, sum(amount)
FROM events
GROUP BY user_id
SETTINGS optimize_aggregation_in_order = 1;
```

Look for `AggregatingInOrderTransform` (followed by `FinishAggregatingInOrderTransform`) vs the plain `AggregatingTransform`. The former indicates the streaming, in-order aggregation enabled when GROUP BY matches an ORDER BY prefix; the latter is the standard hash-based aggregation.

## Setting max_bytes_before_external_group_by

For large aggregations with many groups, ClickHouse can spill to disk:

```sql
SET max_bytes_before_external_group_by = 10000000000;  -- 10GB spill threshold

SELECT event_type, user_id, sum(amount)
FROM events
GROUP BY event_type, user_id;
```

Without this setting, ClickHouse will throw a memory limit exception on large unordered GROUP BY.

## Redesigning the Table for Your Query Pattern

If you frequently aggregate by a different set of keys, consider a materialized view that pre-aggregates:

```sql
-- Materialized view pre-aggregating by event_type
CREATE MATERIALIZED VIEW mv_event_counts
ENGINE = SummingMergeTree()
ORDER BY (event_type, hour)
AS
SELECT
  event_type,
  toStartOfHour(event_time) AS hour,
  count() AS cnt,
  sum(amount) AS total
FROM events
GROUP BY event_type, hour;

-- Query the MV - fast because ORDER BY matches GROUP BY
SELECT event_type, sum(cnt), sum(total)
FROM mv_event_counts
WHERE hour >= today()
GROUP BY event_type;
```

## ORDER BY Column Order Matters

When designing the ORDER BY, place the column used most frequently in GROUP BY queries first, followed by columns used for range filtering.

```sql
-- If most queries group by user_id, put it first
ORDER BY (user_id, event_time)

-- If most queries filter by date and then group by user, consider:
ORDER BY (toDate(event_time), user_id)
```

## Summary

Aligning GROUP BY keys with the table's ORDER BY prefix enables streaming aggregation in ClickHouse, reducing memory usage and improving query speed. For queries that cannot align, set `max_bytes_before_external_group_by` to allow disk spilling. Use materialized views with pre-aggregated SummingMergeTree tables for frequent GROUP BY patterns that do not match the source table's primary key.

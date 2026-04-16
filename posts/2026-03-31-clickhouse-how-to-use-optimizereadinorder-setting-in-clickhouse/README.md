# How to Use optimize_read_in_order Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, optimize_read_in_order, Performance, MergeTree, Query Optimization

Description: Learn how the optimize_read_in_order setting enables ClickHouse to read data in sorted order from MergeTree tables, eliminating expensive sort operations.

---

## Overview

`optimize_read_in_order` (default: enabled) allows ClickHouse to leverage the fact that MergeTree data is stored in sorted order on disk. When a query's `ORDER BY` matches the table's `ORDER BY` (sorting key), ClickHouse reads data in sorted order from each part and merges results without a global sort step. This can dramatically reduce memory usage and query latency for ordered queries.

## How It Works

Without `optimize_read_in_order`, a query like:

```sql
SELECT user_id, event_time FROM events ORDER BY (user_id, event_time)
```

would read all data, then sort it globally in memory.

With `optimize_read_in_order` enabled and the table sorted by `(user_id, event_time)`, ClickHouse reads each part already in sorted order and merges them using a k-way merge - no global sort needed.

## Verifying the Optimization Is Applied

```sql
EXPLAIN SELECT user_id, event_time FROM events ORDER BY user_id, event_time LIMIT 100
```

Look for a `ReadFromMergeTree` step with `Read type: InOrder` in the EXPLAIN output to confirm the optimization is active.

## Enabling and Disabling

```sql
-- Enabled by default; force-disable for benchmarking
SET optimize_read_in_order = 0;
SELECT user_id, event_time FROM events ORDER BY user_id LIMIT 100;

-- Re-enable
SET optimize_read_in_order = 1;
```

## When the Optimization Applies

The optimization applies when:
- The query has an `ORDER BY` that is a prefix of the table's `ORDER BY` key
- Optionally combined with `LIMIT` (stream processing rather than full scan)

```sql
-- Table: ORDER BY (user_id, event_time, action)

-- Optimization applies (prefix match)
SELECT * FROM events ORDER BY user_id LIMIT 100;
SELECT * FROM events ORDER BY user_id, event_time LIMIT 100;
SELECT * FROM events ORDER BY user_id, event_time, action LIMIT 100;

-- Does NOT apply (different key order)
SELECT * FROM events ORDER BY event_time LIMIT 100;
```

## Impact with LIMIT

The combination of `ORDER BY` + `LIMIT` + `optimize_read_in_order` is particularly powerful. ClickHouse can stop reading as soon as enough rows have been found:

```sql
SELECT user_id, event_time, action
FROM events
WHERE user_id = 12345
ORDER BY event_time DESC
LIMIT 10
SETTINGS optimize_read_in_order = 1;
```

This reads the minimum granules needed from the relevant parts.

## optimize_read_in_window_order

A related setting for window functions:

```sql
SELECT
    user_id,
    event_time,
    row_number() OVER (PARTITION BY user_id ORDER BY event_time) AS rn
FROM events
SETTINGS optimize_read_in_window_order = 1;
```

## Practical Benchmark

```sql
-- Measure impact on a large sorted table
SET optimize_read_in_order = 1;
SELECT user_id, max(event_time)
FROM events
GROUP BY user_id
ORDER BY user_id
LIMIT 1000;

-- Compare without optimization
SET optimize_read_in_order = 0;
SELECT user_id, max(event_time)
FROM events
GROUP BY user_id
ORDER BY user_id
LIMIT 1000;
```

Check `system.query_log` for `read_rows`, `memory_usage`, and `query_duration_ms` differences.

## Design Implication - Sort Key as Query Key

Design your table sort keys to align with your most common ORDER BY patterns:

```sql
-- If most queries order by (customer_id, order_date), use this sort key:
CREATE TABLE orders
(
    order_id      UInt64,
    customer_id   UInt64,
    order_date    Date,
    total         Float64
)
ENGINE = MergeTree()
ORDER BY (customer_id, order_date);
```

This ensures `optimize_read_in_order` eliminates sort overhead for the most frequent queries.

## Summary

`optimize_read_in_order` enables ClickHouse to exploit MergeTree's on-disk sorted order to serve `ORDER BY` queries via k-way merge instead of global sort. It applies when the query ORDER BY is a prefix of the table ORDER BY, and is most impactful when combined with LIMIT for streaming top-N queries. Design sort keys to match your most common ORDER BY patterns to maximize this optimization.

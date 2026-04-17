# How to Use EXPLAIN Statement in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, EXPLAIN, Query Analysis, Performance

Description: Learn how to use the EXPLAIN statement in ClickHouse to inspect query execution plans and optimize slow queries.

---

The EXPLAIN statement in ClickHouse lets you inspect how the query engine will execute a SQL query without actually running it. By understanding the execution plan, you can identify inefficiencies such as full table scans, missing primary key usage, or suboptimal join strategies, and then take targeted steps to improve performance.

## Basic EXPLAIN SELECT Syntax

The simplest form of EXPLAIN shows the query plan with logical steps ClickHouse will take.

```sql
EXPLAIN
SELECT user_id, count() AS total_events
FROM events
WHERE event_date >= '2024-01-01'
GROUP BY user_id
ORDER BY total_events DESC
LIMIT 10;
```

Sample output:

```text
Expression (Projection)
  Limit (preliminary LIMIT (without OFFSET))
    Sorting (Sorting for ORDER BY)
      Expression (Before ORDER BY)
        Aggregating
          Expression (Before GROUP BY)
            Filter (WHERE)
              ReadFromMergeTree (events)
```

Each indented line represents a processing step. Execution flows from the innermost node (data reading) outward to the final projection returned to the client.

## Understanding Key Nodes in the Plan

### ReadFromMergeTree

This node shows that ClickHouse is reading from a MergeTree-family table. When your WHERE clause matches the primary key, ClickHouse performs a range scan instead of a full scan.

```sql
-- Table with primary key (event_date, user_id)
EXPLAIN indexes = 1
SELECT count()
FROM events
WHERE event_date = '2024-06-15';
```

The `indexes = 1` setting is required to include the `Indexes:` section in the output. Mark ranges read confirm primary key usage:

```text
ReadFromMergeTree (events)
Indexes:
  PrimaryKey
    Keys:
      event_date
    Condition: (event_date in ['2024-06-15', '2024-06-15'])
    Parts: 3/12
    Granules: 41/980
```

The `Parts: 3/12` line tells you only 3 of 12 data parts were read - a sign of effective pruning.

### Filter Node

A `Filter` node appears when a WHERE clause cannot be pushed down into the storage layer and must be applied as a post-read filter.

```sql
EXPLAIN
SELECT *
FROM events
WHERE lower(event_name) = 'click';
```

```text
Filter (WHERE)
  ReadFromMergeTree (events)
```

Because `lower()` wraps the column, ClickHouse cannot use the primary index. Consider storing a pre-lowercased column or using a skip index for such patterns.

### Aggregating Node

```sql
EXPLAIN
SELECT toStartOfHour(event_time) AS hour, count() AS hits
FROM events
GROUP BY hour;
```

```text
Expression (Projection)
  Aggregating
    Expression (Before GROUP BY)
      ReadFromMergeTree (events)
```

When you see `Aggregating` directly above `ReadFromMergeTree`, partial aggregation happens at the storage level when the aggregation key aligns with the sorting key - a performance win.

## Using EXPLAIN with Settings

You can pass options to control the verbosity of the plan output.

```sql
-- Show header (column names/types) for each step
EXPLAIN header = 1
SELECT user_id, sum(amount) AS total
FROM orders
WHERE status = 'completed'
GROUP BY user_id;
```

```sql
-- Show detailed actions at each step
EXPLAIN actions = 1
SELECT user_id, sum(amount) AS total
FROM orders
GROUP BY user_id;
```

```sql
-- Combine header and actions for maximum detail
EXPLAIN header = 1, actions = 1
SELECT user_id, sum(amount) AS total
FROM orders
GROUP BY user_id;
```

## Practical Optimization Example

Suppose you have a slow query and want to diagnose it:

```sql
-- Slow query
SELECT region, count() AS sessions
FROM user_sessions
WHERE toYear(session_start) = 2024
GROUP BY region;
```

Running EXPLAIN reveals no primary key usage because `toYear()` wraps the column. The fix is to rewrite the filter:

```sql
-- Optimized: use a range that allows primary key pruning
EXPLAIN indexes = 1
SELECT region, count() AS sessions
FROM user_sessions
WHERE session_start >= '2024-01-01' AND session_start < '2025-01-01'
GROUP BY region;
```

After rewriting, the plan should show `Parts: X/Y` with X much smaller than Y, confirming granule pruning.

## Comparing Two Query Variants

EXPLAIN is useful for side-by-side comparison of rewrites:

```sql
-- Variant A: IN subquery
EXPLAIN
SELECT *
FROM orders
WHERE user_id IN (SELECT user_id FROM vip_users);

-- Variant B: JOIN
EXPLAIN
SELECT o.*
FROM orders o
INNER JOIN vip_users v ON o.user_id = v.user_id;
```

Inspecting both plans helps you choose the variant with fewer intermediate rows and simpler execution steps.

## Summary

The EXPLAIN statement is an essential tool for diagnosing slow ClickHouse queries. Reading the plan from the innermost node outward reveals how data is read, filtered, grouped, and sorted. Pay close attention to `Parts` and `Granules` ratios under `ReadFromMergeTree` to confirm that primary key pruning is working, and use the `header` and `actions` options when you need deeper column-level detail.

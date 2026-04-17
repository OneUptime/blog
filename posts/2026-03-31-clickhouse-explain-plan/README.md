# How to Use EXPLAIN PLAN in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, EXPLAIN, Query Plan, Performance

Description: Learn how EXPLAIN PLAN in ClickHouse shows the logical query plan with headers, actions, and descriptions for performance tuning.

---

`EXPLAIN PLAN` in ClickHouse prints the logical execution plan for a query, showing the sequence of processing steps with optional metadata about column types, actions performed at each step, and textual descriptions. It offers more detail than the default `EXPLAIN` output and is the primary tool for understanding how ClickHouse structures a query's computation before translating it into a physical pipeline.

## Basic EXPLAIN PLAN Syntax

`EXPLAIN PLAN` and `EXPLAIN` are equivalent - both print the logical plan. Adding options unlocks additional detail:

```sql
-- Basic plan (same as EXPLAIN)
EXPLAIN PLAN
SELECT user_id, count() AS events
FROM events
WHERE event_date >= '2024-01-01'
GROUP BY user_id;
```

```text
Expression (Projection)
  Aggregating
    Expression (Before GROUP BY)
      Filter (WHERE)
        ReadFromMergeTree (events)
```

## Plan with Descriptions

`description = 1` is enabled by default and adds a short annotation in parentheses next to each node, such as `(Projection)`, `(WHERE)`, or `(Before GROUP BY)`. Setting it explicitly produces the same output as the basic plan:

```sql
EXPLAIN PLAN description = 1
SELECT user_id, count() AS events
FROM events
WHERE event_date >= '2024-01-01'
GROUP BY user_id;
```

```text
Expression (Projection)
  Aggregating
    Expression (Before GROUP BY)
      Filter (WHERE)
        ReadFromMergeTree (events)
```

Setting `description = 0` strips the parenthetical annotations and leaves only bare node type names. The default annotations make it easier to communicate plan structure in code reviews or documentation.

## Plan with Header (Column Types)

Use `header = 1` to show the output schema (column names and types) at each plan step:

```sql
EXPLAIN PLAN header = 1
SELECT user_id, count() AS events
FROM events
WHERE event_date >= '2024-01-01'
GROUP BY user_id;
```

```text
Expression (Projection)
Header: user_id UInt64
        events UInt64
  Aggregating
  Header: user_id UInt64
          count() UInt64
    Expression (Before GROUP BY)
    Header: user_id UInt64
            event_date Date
      Filter (WHERE)
      Header: user_id UInt64
              event_date Date
        ReadFromMergeTree (events)
        Header: user_id UInt64
                event_date Date
```

The header at each step shows what columns flow through. This is useful for catching implicit type casts or confirming that a column is available at the point where it is referenced.

## Plan with Actions

Use `actions = 1` to show the specific column transformations applied at each `Expression` node:

```sql
EXPLAIN PLAN actions = 1
SELECT
    user_id,
    toStartOfMonth(event_date) AS month,
    count() AS events
FROM events
GROUP BY user_id, month;
```

```text
Expression (Projection)
Actions: INPUT :: 0 -> user_id UInt64 : 0
         INPUT :: 1 -> count() UInt64 : 1
         ALIAS count() :: 1 -> events UInt64 : 2
Positions: 0 2
  Aggregating
    Expression (Before GROUP BY)
    Actions: INPUT :: 0 -> user_id UInt64 : 0
             INPUT :: 1 -> event_date Date : 1
             FUNCTION toStartOfMonth(event_date :: 1) -> toStartOfMonth(event_date) Date : 2
    Positions: 0 2
      ReadFromMergeTree (events)
```

The actions show the exact function calls and column renames, making it possible to trace every column transformation.

## Interpreting Sorting and Filtering Nodes

### Sorting Nodes

```sql
EXPLAIN PLAN header = 1
SELECT user_id, sum(amount) AS total
FROM orders
GROUP BY user_id
ORDER BY total DESC
LIMIT 20;
```

```text
Expression (Projection)
  Limit (preliminary LIMIT)
    Sorting (Sorting for ORDER BY)
    Header: user_id UInt64
            total Float64
      Expression (Before ORDER BY)
        Aggregating
          Expression (Before GROUP BY)
            ReadFromMergeTree (orders)
```

`Sorting (Sorting for ORDER BY)` means a full sort is required. If you see `MergeTree` data is already sorted by the ORDER BY key, you may be able to eliminate this node by aligning your query key with the table's sorting key.

### Filter Pushdown

```sql
EXPLAIN PLAN actions = 1
SELECT count()
FROM events
WHERE event_date BETWEEN '2024-01-01' AND '2024-03-31'
  AND event_type = 'purchase';
```

When `Filter` appears as a direct child of `ReadFromMergeTree`, the predicate was partially pushed into the storage scan. When it appears higher in the tree, it is applied after reading, which is less efficient.

## Combining All Options

For the most detailed output, combine all options:

```sql
EXPLAIN PLAN header = 1, actions = 1, description = 1
SELECT
    region,
    toStartOfWeek(order_date) AS week,
    sum(revenue) AS total_revenue
FROM sales
WHERE order_date >= '2024-01-01'
GROUP BY region, week
ORDER BY week, total_revenue DESC;
```

This combined output provides column types, transformation actions, and textual descriptions at every step, giving you a complete picture of the logical plan.

## Summary

`EXPLAIN PLAN` is the most detailed logical plan view available in ClickHouse. Use `description = 1` for annotated step explanations, `header = 1` to trace column types through the plan, and `actions = 1` to see exact function calls and column renames. Combining these options produces a thorough audit trail of how ClickHouse will process your query, making it straightforward to catch unexpected type casts, missing filter pushdowns, and avoidable sort operations.

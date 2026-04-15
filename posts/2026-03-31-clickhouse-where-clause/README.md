# How to Use WHERE Clauses Effectively in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, WHERE, Filter, Performance

Description: Master WHERE and PREWHERE in ClickHouse, covering comparison operators, IN, LIKE, NULL handling, and index-aware filtering for fast queries.

---

Filtering rows efficiently is one of the most important skills when working with ClickHouse. Because ClickHouse is a columnar database designed for analytical workloads, the way you write your WHERE clause directly affects which granules are read from disk and how many rows the query engine must process. This post covers the full range of WHERE clause features - from basic comparisons to PREWHERE optimization.

## Basic Comparison Operators

ClickHouse supports all standard SQL comparison operators.

```sql
SELECT *
FROM events
WHERE event_type = 'click';

SELECT *
FROM events
WHERE value > 10.0;

SELECT *
FROM events
WHERE created_at >= '2026-01-01 00:00:00'
  AND created_at <  '2026-02-01 00:00:00';
```

### Not Equal

Use `!=` or `<>` for inequality.

```sql
SELECT *
FROM events
WHERE event_type != 'view';
```

## IN and NOT IN

`IN` checks membership against a list of values or a subquery result.

```sql
SELECT *
FROM events
WHERE event_type IN ('click', 'buy', 'add_to_cart');

SELECT *
FROM events
WHERE user_id NOT IN (SELECT user_id FROM blocked_users);
```

For large value sets, `IN` with a subquery is often faster than multiple OR conditions because ClickHouse can build a hash set internally.

```sql
-- Prefer IN over chained OR for multiple values
SELECT *
FROM events
WHERE user_id IN (101, 102, 103, 104, 105);
```

## LIKE and ILIKE

`LIKE` performs case-sensitive pattern matching. `ILIKE` is case-insensitive.

```sql
-- Starts with 'click'
SELECT * FROM events WHERE event_type LIKE 'click%';

-- Contains 'err' anywhere
SELECT * FROM logs   WHERE message LIKE '%err%';

-- Case-insensitive match
SELECT * FROM events WHERE event_type ILIKE 'CLICK%';
```

Note: Leading wildcards (`%value`) prevent index usage and trigger full scans. Prefer prefix patterns (`value%`) when possible.

## PREWHERE vs WHERE

`PREWHERE` is a ClickHouse-specific optimization that filters rows before reading all requested columns from disk. It is especially effective when the filter column is small (e.g., a numeric flag or date) and the table is wide.

```sql
-- PREWHERE reads only event_type column first, then fetches other columns
SELECT
    event_id,
    user_id,
    value
FROM events
PREWHERE event_type = 'buy'
WHERE value > 50.0;
```

ClickHouse can automatically move suitable WHERE conditions to PREWHERE. You can disable this with the setting `optimize_move_to_prewhere = 0`. In most cases, let the optimizer decide and only use explicit PREWHERE when you have benchmarked its benefit.

```sql
-- Disable automatic PREWHERE promotion for a specific query
SELECT *
FROM events
WHERE event_type = 'buy'
SETTINGS optimize_move_to_prewhere = 0;
```

## NULL Handling

ClickHouse uses `isNull()` and `isNotNull()` (or the `IS NULL` / `IS NOT NULL` SQL syntax) for NULL checks. Comparing a Nullable column to a value with `=` will not match NULL rows.

```sql
-- Correct NULL check
SELECT * FROM orders WHERE cancelled_at IS NULL;
SELECT * FROM orders WHERE cancelled_at IS NOT NULL;

-- Using functions
SELECT * FROM orders WHERE isNull(cancelled_at);
SELECT * FROM orders WHERE isNotNull(cancelled_at);
```

## Combining Conditions

Use `AND`, `OR`, and parentheses to combine conditions. ClickHouse short-circuits `AND` conditions, so place the most selective filter first.

```sql
SELECT *
FROM events
WHERE event_type = 'buy'
  AND value > 100.0
  AND created_at >= today() - 7;
```

```sql
SELECT *
FROM events
WHERE (event_type = 'buy' AND value > 100.0)
   OR (event_type = 'refund' AND value < 0);
```

## Index Utilization

ClickHouse uses a sparse primary index. To take full advantage of it, include the leading columns of the `ORDER BY` (primary key) in your WHERE clause as equality or range conditions.

```sql
-- Table ordered by (event_type, created_at)
-- This query uses the primary index effectively
SELECT *
FROM events
WHERE event_type = 'click'
  AND created_at >= '2026-03-01'
  AND created_at <  '2026-04-01';
```

```sql
-- Check if a query uses index
EXPLAIN indexes = 1
SELECT * FROM events WHERE event_type = 'buy';
```

## Practical Example

```sql
-- Find high-value purchase events in the last 30 days
-- excluding known bot user IDs
SELECT
    event_id,
    user_id,
    value,
    created_at
FROM events
PREWHERE event_type = 'buy'
WHERE value >= 200.0
  AND created_at >= now() - INTERVAL 30 DAY
  AND user_id NOT IN (SELECT user_id FROM bot_users)
ORDER BY value DESC
LIMIT 100;
```

## Summary

Writing effective WHERE clauses in ClickHouse means understanding how the sparse primary index works, when to use PREWHERE explicitly, and how to handle NULL values in Nullable columns. Placing the most selective index-aligned conditions first and avoiding leading wildcards in LIKE patterns keeps queries fast even on billions of rows.

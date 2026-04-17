# How to Use count() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Count

Description: Learn how to use count(), count(column), count(DISTINCT col), and countIf() in ClickHouse with performance tips and practical examples.

---

`count()` is the most commonly used aggregate function in ClickHouse. It is fast, flexible, and has several variants - `count(*)`, `count(column)`, `count(DISTINCT col)`, and `countIf()` - each with different semantics and performance characteristics. Understanding the differences helps you write accurate, efficient queries.

## Basic count() and count(*)

`count()` with no argument and `count(*)` both count the total number of rows in a group, including rows with NULL values.

```sql
CREATE TABLE orders
(
    order_id   UInt64,
    user_id    UInt64,
    status     Nullable(String),
    amount     Float64,
    created_at DateTime
)
ENGINE = MergeTree()
ORDER BY (created_at, order_id);

-- Count all rows in the table
SELECT count() FROM orders;

-- Equivalent form
SELECT count(*) FROM orders;
```

Both return identical results. In ClickHouse, `count()` (no argument) is preferred and marginally faster because it avoids parsing the `*` wildcard.

## count(column) - Counting Non-NULL Values

When you pass a column to `count()`, it counts only the rows where that column is not NULL.

```sql
-- Count rows where status is not NULL
SELECT count(status) FROM orders;

-- Compare with total row count
SELECT
    count()         AS total_rows,
    count(status)   AS rows_with_status
FROM orders;
```

This is useful for measuring data completeness - the difference between `count()` and `count(column)` tells you how many NULLs exist.

```sql
-- Find NULL rate per column
SELECT
    count()                                       AS total,
    count(status)                                 AS status_not_null,
    total - status_not_null                       AS status_nulls,
    round(status_nulls / total * 100, 2)          AS null_pct
FROM orders;
```

## count(DISTINCT col) - Counting Unique Values

`count(DISTINCT col)` returns the number of unique non-NULL values in a column. By default, it is equivalent to `uniqExact()`, which uses an exact algorithm (controlled by the `count_distinct_implementation` setting).

```sql
-- Count distinct users who placed orders
SELECT count(DISTINCT user_id) FROM orders;

-- Distinct status values
SELECT count(DISTINCT status) FROM orders;
```

### count(DISTINCT) vs uniq()

For large datasets, prefer `uniq()` over `count(DISTINCT)`. `uniq()` uses a compact approximate-distinct algorithm that is orders of magnitude faster and uses much less memory.

```sql
-- Exact distinct count (slower, more memory)
SELECT count(DISTINCT user_id) FROM orders;

-- Approximate distinct count (faster, less memory)
SELECT uniq(user_id) FROM orders;

-- Exact uniq - same as count(DISTINCT) but explicit
SELECT uniqExact(user_id) FROM orders;
```

## countIf() - Conditional Counting

`countIf(condition)` counts rows where the condition evaluates to true. It avoids a subquery or `CASE` expression.

```sql
-- Count orders by status using countIf
SELECT
    countIf(status = 'completed')   AS completed,
    countIf(status = 'pending')     AS pending,
    countIf(status = 'cancelled')   AS cancelled,
    count()                          AS total
FROM orders;
```

You can combine `countIf` with more complex conditions:

```sql
-- High-value completed orders placed in the last 7 days
SELECT countIf(status = 'completed' AND amount > 100 AND created_at >= now() - INTERVAL 7 DAY)
FROM orders;
```

### countIf vs count with WHERE

`countIf` is especially useful when you need multiple conditional counts in a single pass - it scans the table once, whereas multiple filtered subqueries each scan separately.

```sql
-- Single scan, multiple conditional counts
SELECT
    toDate(created_at)              AS day,
    countIf(amount < 50)            AS small_orders,
    countIf(amount BETWEEN 50 AND 200) AS medium_orders,
    countIf(amount > 200)           AS large_orders
FROM orders
GROUP BY day
ORDER BY day;
```

## count() with GROUP BY

`count()` is most commonly used with `GROUP BY` to produce per-group tallies.

```sql
-- Orders per user
SELECT
    user_id,
    count()     AS order_count,
    sum(amount) AS total_spent
FROM orders
GROUP BY user_id
ORDER BY order_count DESC
LIMIT 10;
```

```sql
-- Daily order counts broken down by status
SELECT
    toDate(created_at)              AS day,
    status,
    count()                          AS cnt
FROM orders
GROUP BY day, status
ORDER BY day, status;
```

## Performance Considerations

ClickHouse stores data in a columnar format and applies lightweight compression. `count()` with no column argument is especially fast because ClickHouse can satisfy it from stored row count metadata in many cases, without reading column data at all.

```sql
-- Check how many rows a query will scan before running it
EXPLAIN SELECT count() FROM orders WHERE toDate(created_at) = '2026-03-31';
```

For `count(DISTINCT col)` on high-cardinality columns with billions of rows, always benchmark `uniqExact()` vs `uniq()` to decide whether exact results are worth the cost.

```sql
-- Benchmark comparison
SELECT
    uniq(user_id)      AS approx_distinct_users,
    uniqExact(user_id) AS exact_distinct_users
FROM orders;
```

## Summary

`count()` and `count(*)` count all rows including NULLs, while `count(column)` skips NULLs. Use `countIf()` for conditional aggregation in a single scan instead of multiple filtered subqueries. For distinct counts on large datasets, prefer `uniq()` over `count(DISTINCT col)` unless exact precision is required.

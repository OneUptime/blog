# How to Use QUALIFY Clause in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, QUALIFY, Window Function, Filter

Description: Filter rows by window function results directly in ClickHouse using the QUALIFY clause, avoiding verbose subqueries or CTEs.

---

Window functions compute values like row numbers, ranks, and running totals without collapsing rows the way `GROUP BY` does. The problem is that you cannot reference a window function result in a `WHERE` clause - `WHERE` is evaluated before window functions run. The traditional workaround is to wrap the entire query in a subquery and filter in the outer `WHERE`. ClickHouse's `QUALIFY` clause solves this cleanly: it is evaluated after window functions and lets you filter on their results directly, the same way `HAVING` filters on aggregate results.

## Basic Syntax

`QUALIFY` appears after `WINDOW` (if present) and before `ORDER BY`:

```sql
SELECT
    col1,
    col2,
    window_function() OVER (...) AS win_col
FROM table_name
QUALIFY win_col = 1;
```

The expression inside `QUALIFY` can reference window function results either by their alias or inline.

## Row Deduplication - Keep the Latest Row Per Group

The most common use case is keeping the single most-recent row per group, replacing a subquery with a one-liner:

```sql
-- Subquery approach (verbose)
SELECT *
FROM (
    SELECT
        *,
        row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC) AS rn
    FROM user_profiles
)
WHERE rn = 1;

-- QUALIFY approach (concise)
SELECT *
FROM user_profiles
QUALIFY row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC) = 1;
```

## Top-N Per Group

Return the top 3 products by revenue for each category:

```sql
SELECT
    category,
    product,
    revenue
FROM products
QUALIFY rank() OVER (PARTITION BY category ORDER BY revenue DESC) <= 3
ORDER BY category, revenue DESC;
```

## Using an Alias in QUALIFY

You can assign the window function a column alias in `SELECT` and then reference it in `QUALIFY`:

```sql
SELECT
    session_id,
    event_name,
    ts,
    row_number() OVER (PARTITION BY session_id ORDER BY ts) AS seq
FROM events
QUALIFY seq = 1;
-- Returns only the first event in each session
```

## Percentile Filtering with ntile()

Keep only rows in the top 10 percent by response time:

```sql
SELECT
    request_id,
    endpoint,
    response_ms
FROM http_logs
QUALIFY ntile(10) OVER (ORDER BY response_ms DESC) = 1
ORDER BY response_ms DESC;
```

## Filtering with dense_rank()

```sql
-- Return the two highest-revenue orders per customer,
-- treating ties as the same rank
SELECT
    customer_id,
    order_id,
    order_total
FROM orders
QUALIFY dense_rank() OVER (
    PARTITION BY customer_id
    ORDER BY order_total DESC
) <= 2
ORDER BY customer_id, order_total DESC;
```

## QUALIFY with Multiple Window Functions

`QUALIFY` can reference multiple window functions in a single expression:

```sql
SELECT
    user_id,
    event_name,
    ts,
    row_number() OVER (PARTITION BY user_id ORDER BY ts)       AS seq,
    count()      OVER (PARTITION BY user_id)                   AS total_events
FROM events
QUALIFY seq = 1 OR seq = total_events;
-- Keep only the first and last event per user
```

## QUALIFY vs. Subquery - Performance Note

Both approaches produce the same result. The `QUALIFY` form is preferred for readability - it keeps the filtering logic adjacent to the window function definition rather than buried in an outer wrapper:

```sql
-- Equivalent subquery - harder to read and maintain
SELECT *
FROM (
    SELECT
        *,
        row_number() OVER (PARTITION BY user_id ORDER BY ts) AS rn,
        count()      OVER (PARTITION BY user_id)             AS total
    FROM events
)
WHERE rn = 1 OR rn = total;
```

## Summary

`QUALIFY` is the ClickHouse clause for filtering on window function results without a wrapping subquery. It is evaluated after all window functions complete, making it the correct layer for row-number deduplication, top-N-per-group selection, and percentile filtering. The query must contain at least one window function for `QUALIFY` to be used - if there are no window functions, use `WHERE` instead. You can reference window function results by alias or inline expression.

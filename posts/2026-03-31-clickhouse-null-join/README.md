# How to Handle NULLs in JOIN Operations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NULL Handling, Join, Query Pattern, Analytics

Description: Learn how NULL values behave in ClickHouse JOIN operations, including INNER, LEFT, and FULL OUTER joins, and how to correctly filter, preserve, or substitute NULLs in join results.

---

In ClickHouse, NULL values in join keys behave as in standard SQL: `NULL != NULL`, so rows with NULL join keys never match. In an `INNER JOIN`, rows with NULL keys on either side are excluded from the result. In a `LEFT JOIN`, rows from the left table with NULL keys appear in the result but do not match any right-side row, so right-side columns are NULL. Understanding this behavior is critical for correct aggregations and reports built on joined tables.

## Setting Up Sample Tables

All queries in this post assume the following setting is enabled:

```sql
SET join_use_nulls = 1;
```

By default, ClickHouse fills unmatched right-side columns in JOINs with the type's default value (0, empty string, etc.) instead of NULL. Setting `join_use_nulls = 1` makes ClickHouse return NULL for all unmatched columns, which matches standard SQL behavior and is required for patterns like `IS NULL` anti-joins and `ifNull` substitutions shown below.

```sql
CREATE TABLE orders
(
    order_id    UInt64,
    user_id     Nullable(UInt64),
    amount      Float64,
    order_date  Date
)
ENGINE = MergeTree()
ORDER BY order_id;
```

```sql
CREATE TABLE users
(
    user_id     UInt64,
    username    String,
    country     Nullable(String)
)
ENGINE = MergeTree()
ORDER BY user_id;
```

```sql
INSERT INTO orders VALUES
    (1, 101, 50.00,  '2024-06-01'),
    (2, 102, 75.50,  '2024-06-01'),
    (3, NULL, 20.00, '2024-06-02'),  -- guest order, no user_id
    (4, 103, 120.00, '2024-06-02'),
    (5, NULL, 30.00, '2024-06-03'),  -- another guest order
    (6, 104, 90.00,  '2024-06-03');
```

```sql
INSERT INTO users VALUES
    (101, 'alice',   'US'),
    (102, 'bob',     'UK'),
    (103, 'charlie', NULL),   -- country is NULL
    (105, 'eve',     'FR');   -- user 104 is missing; user 105 has no orders
```

## INNER JOIN - NULL Keys Are Excluded

```sql
-- INNER JOIN: guest orders (NULL user_id) are excluded
SELECT
    o.order_id,
    o.user_id,
    o.amount,
    u.username,
    u.country
FROM orders AS o
INNER JOIN users AS u ON o.user_id = u.user_id
ORDER BY o.order_id;
```

```text
order_id  user_id  amount  username  country
1         101      50.00   alice     US
2         102      75.50   bob       UK
4         103      120.00  charlie   NULL
```

Orders 3 and 5 (NULL `user_id`) are excluded. Order 6 (user 104) is excluded because user 104 does not exist in the users table.

## LEFT JOIN - NULL Keys on Left Side

```sql
-- LEFT JOIN: all orders appear; guest orders have NULL right-side columns
SELECT
    o.order_id,
    o.user_id,
    o.amount,
    u.username,
    u.country
FROM orders AS o
LEFT JOIN users AS u ON o.user_id = u.user_id
ORDER BY o.order_id;
```

```text
order_id  user_id  amount  username  country
1         101      50.00   alice     US
2         102      75.50   bob       UK
3         NULL     20.00   NULL      NULL
4         103      120.00  charlie   NULL
5         NULL     30.00   NULL      NULL
6         104      90.00   NULL      NULL
```

Guest orders (NULL `user_id`) and unmatched user 104 both produce NULL columns on the right side.

## Handling NULL Join Results with ifNull

```sql
-- Replace NULL right-side values with meaningful defaults
SELECT
    o.order_id,
    ifNull(toString(o.user_id), 'guest')  AS user_label,
    o.amount,
    ifNull(u.username, 'Guest User')       AS username,
    ifNull(u.country, 'Unknown')           AS country
FROM orders AS o
LEFT JOIN users AS u ON o.user_id = u.user_id
ORDER BY o.order_id;
```

```text
order_id  user_label  amount  username     country
1         101         50.00   alice        US
2         102         75.50   bob          UK
3         guest       20.00   Guest User   Unknown
4         103         120.00  charlie      Unknown
5         guest       30.00   Guest User   Unknown
6         104         90.00   Guest User   Unknown
```

## Filtering Out Unmatched Rows After LEFT JOIN

```sql
-- Find orders placed by registered users only (equivalent to INNER JOIN, but explicit)
SELECT
    o.order_id,
    u.username,
    o.amount
FROM orders AS o
LEFT JOIN users AS u ON o.user_id = u.user_id
WHERE u.user_id IS NOT NULL  -- exclude unmatched rows
ORDER BY o.order_id;
```

## Identifying Unmatched Rows

```sql
-- Find orders with no matching user (guests or missing user records)
SELECT
    o.order_id,
    o.user_id,
    o.amount,
    CASE
        WHEN o.user_id IS NULL THEN 'guest'
        WHEN u.user_id IS NULL THEN 'missing_user'
        ELSE 'matched'
    END AS match_status
FROM orders AS o
LEFT JOIN users AS u ON o.user_id = u.user_id
ORDER BY o.order_id;
```

```text
order_id  user_id  amount  match_status
1         101      50.00   matched
2         102      75.50   matched
3         NULL     20.00   guest
4         103      120.00  matched
5         NULL     30.00   guest
6         104      90.00   missing_user
```

## Aggregating with NULL-Safe Logic After JOIN

```sql
-- Revenue by country, treating NULL country and guest orders correctly
SELECT
    ifNull(u.country, 'Unknown') AS country,
    count()                       AS order_count,
    sum(o.amount)                 AS total_revenue
FROM orders AS o
LEFT JOIN users AS u ON o.user_id = u.user_id
GROUP BY country
ORDER BY total_revenue DESC;
```

```text
country  order_count  total_revenue
Unknown  4            260.00
UK       1            75.50
US       1            50.00
```

## Anti-Join: Users with No Orders

```sql
-- Users who have placed no orders (anti-join via LEFT JOIN + IS NULL filter)
SELECT
    u.user_id,
    u.username
FROM users AS u
LEFT JOIN orders AS o ON u.user_id = o.user_id
WHERE o.order_id IS NULL
ORDER BY u.user_id;
```

```text
user_id  username
105      eve
```

## Using assumeNotNull in Join Keys

If you are certain a nullable column has no NULLs for the relevant rows, strip the wrapper to simplify the join.

```sql
-- Join after filtering NULLs, then use assumeNotNull for type compatibility
SELECT
    o.order_id,
    u.username
FROM (
    SELECT order_id, assumeNotNull(user_id) AS user_id, amount
    FROM orders
    WHERE user_id IS NOT NULL
) AS o
INNER JOIN users AS u ON o.user_id = u.user_id
ORDER BY o.order_id;
```

## FULL OUTER JOIN and NULL Handling

```sql
-- Full outer join to see all orders and all users
SELECT
    ifNull(toString(o.order_id), '-')  AS order_id,
    ifNull(u.username, 'Guest')        AS username,
    ifNull(o.amount, 0.0)              AS amount
FROM orders AS o
FULL OUTER JOIN users AS u ON o.user_id = u.user_id
ORDER BY o.order_id NULLS LAST, u.user_id;
```

## Summary

In ClickHouse JOIN operations, NULL join keys never match - not even each other - so rows with NULL keys are excluded from `INNER JOIN` results and appear as unmatched rows in `LEFT JOIN` results with NULL values for the right-side columns. Use `ifNull` to substitute readable defaults for NULL right-side columns, `IS NULL` / `IS NOT NULL` filters to identify matched vs unmatched rows, and `assumeNotNull` to strip the nullable wrapper when you are sure no NULLs remain after filtering. These patterns cover the most common NULL-related correctness issues in join-heavy analytics queries.

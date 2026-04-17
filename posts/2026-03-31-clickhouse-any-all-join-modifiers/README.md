# How to Use ANY and ALL Modifiers with JOINs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, Join, Any, ALL

Description: Learn how the ANY and ALL join modifiers change match behavior in ClickHouse JOINs, controlling whether duplicate right-side rows produce duplicate output rows.

---

ClickHouse extends standard SQL JOIN syntax with `ANY` and `ALL` modifiers that control what happens when the right table contains multiple rows matching a single left-table row. `ALL` (the default) keeps every matching pair, producing one output row per match. `ANY` keeps only the first match per left-table row, deduplicating the result. Understanding these modifiers helps you write cleaner queries and avoid accidental row multiplication.

## ALL Modifier (Default Behavior)

`JOIN ALL` is the default. For each left-table row, all matching right-table rows are included, producing a new output row for each match. This is the standard SQL behavior for inner and outer joins.

```sql
-- A user with 3 orders will appear 3 times
SELECT
    u.user_id,
    u.name,
    o.order_id,
    o.amount
FROM users AS u
ALL INNER JOIN orders AS o ON u.user_id = o.user_id
ORDER BY u.user_id, o.order_id;
```

You can write `ALL` explicitly to make the intention clear, or omit it since it is the default:

```sql
-- Explicit ALL - same as omitting the modifier
SELECT u.name, o.order_id
FROM users AS u
ALL LEFT JOIN orders AS o ON u.user_id = o.user_id;
```

## ANY Modifier

`JOIN ANY` keeps only the first matching row from the right table for each left-table row. If the right table has multiple matches, subsequent matches are silently discarded. This prevents row multiplication when you only need one representative value from the right side.

```sql
-- Each user appears exactly once, with one arbitrary matching order
SELECT
    u.user_id,
    u.name,
    o.order_id,
    o.amount
FROM users AS u
ANY INNER JOIN orders AS o ON u.user_id = o.user_id
ORDER BY u.user_id;
```

The "first" row is determined by the physical order in which rows appear in the right table's storage. To control which row is selected, use a subquery that imposes an explicit order:

```sql
-- Use a subquery to control which row ANY selects (most recent order)
SELECT
    u.user_id,
    u.name,
    latest.order_id,
    latest.amount
FROM users AS u
ANY INNER JOIN (
    SELECT
        user_id,
        argMax(order_id, order_date) AS order_id,
        argMax(amount, order_date)   AS amount
    FROM orders
    GROUP BY user_id
) AS latest ON u.user_id = latest.user_id;
```

## ANY LEFT JOIN

`ANY LEFT JOIN` returns every left-table row exactly once, with matched columns from the first right-table match (or default values such as `0` and `''` if no match exists; enable `join_use_nulls` to get NULLs instead).

```sql
-- Every user appears once; non-matching users get default values (0, empty string) for order columns
SELECT
    u.user_id,
    u.name,
    o.order_id,
    o.amount
FROM users AS u
ANY LEFT JOIN orders AS o ON u.user_id = o.user_id
ORDER BY u.user_id;
```

## Comparing ANY vs ALL Output

```sql
-- Setup: user 1 has 2 orders, user 2 has 1 order
-- ALL INNER JOIN result: 3 rows total
SELECT u.user_id, o.order_id
FROM users AS u
ALL INNER JOIN orders AS o ON u.user_id = o.user_id;
-- user 1 | order 10
-- user 1 | order 11
-- user 2 | order 20

-- ANY INNER JOIN result: 2 rows total (one per user)
SELECT u.user_id, o.order_id
FROM users AS u
ANY INNER JOIN orders AS o ON u.user_id = o.user_id;
-- user 1 | order 10  (first match only)
-- user 2 | order 20
```

## Using ANY with SETTINGS join_use_nulls

By default, ClickHouse returns the type's default value (0, empty string) rather than NULL for non-matching `ANY LEFT JOIN` rows. To get standard SQL NULL behavior, enable `join_use_nulls`:

```sql
SET join_use_nulls = 1;

SELECT
    u.user_id,
    u.name,
    o.order_id  -- NULL if no match, not 0
FROM users AS u
ANY LEFT JOIN orders AS o ON u.user_id = o.user_id;
```

## Practical Use Case - Enriching Events with User Metadata

When enriching a large events table with a user dimension table, `ANY LEFT JOIN` is ideal because each event maps to at most one user, and you only want one row per event:

```sql
SELECT
    e.event_id,
    e.event_type,
    e.event_time,
    u.name        AS user_name,
    u.country     AS user_country
FROM events AS e
ANY LEFT JOIN users AS u ON e.user_id = u.user_id
WHERE e.event_time >= today() - 7
ORDER BY e.event_time DESC
LIMIT 1000;
```

## Summary

ClickHouse `JOIN ALL` (the default) produces one output row for every matching pair, which can multiply rows when the right side has multiple matches. `JOIN ANY` keeps only the first right-side match per left-table row, guaranteeing at most one output row per input row. Use `ANY LEFT JOIN` when enriching a fact table with a dimension lookup to prevent row duplication, and use `ALL INNER JOIN` or `ALL LEFT JOIN` when you genuinely need all matching pairs.

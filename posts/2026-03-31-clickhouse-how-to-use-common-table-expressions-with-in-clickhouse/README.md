# How to Use Common Table Expressions (WITH) in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Common Table Expression, WITH Clause, Query Optimization

Description: Learn how to use Common Table Expressions (CTEs) with the WITH clause in ClickHouse to write cleaner, reusable, and recursive SQL queries.

---

## What Are Common Table Expressions

Common Table Expressions (CTEs) are named temporary result sets defined in the `WITH` clause at the beginning of a query. They make complex queries more readable by breaking them into named steps.

In ClickHouse, CTEs are supported and work similarly to other SQL databases, with some ClickHouse-specific behaviors.

```sql
-- Basic CTE syntax
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;
```

## Basic CTE Example

```sql
-- Without CTE: nested and hard to read
SELECT
    user_id,
    order_count,
    total_spent
FROM (
    SELECT user_id, count() AS order_count, sum(amount) AS total_spent
    FROM orders
    GROUP BY user_id
) AS user_stats
WHERE order_count > 5
ORDER BY total_spent DESC;

-- With CTE: clean and readable
WITH user_stats AS (
    SELECT
        user_id,
        count() AS order_count,
        sum(amount) AS total_spent
    FROM orders
    GROUP BY user_id
)
SELECT user_id, order_count, total_spent
FROM user_stats
WHERE order_count > 5
ORDER BY total_spent DESC;
```

## Multiple CTEs

Chain multiple CTEs together:

```sql
WITH
    -- First CTE: user order stats
    user_stats AS (
        SELECT
            user_id,
            count() AS order_count,
            sum(amount) AS total_spent,
            max(order_date) AS last_order
        FROM orders
        GROUP BY user_id
    ),
    -- Second CTE: segment users
    segmented AS (
        SELECT
            user_id,
            order_count,
            total_spent,
            last_order,
            CASE
                WHEN total_spent > 1000 THEN 'VIP'
                WHEN total_spent > 100  THEN 'Regular'
                ELSE 'New'
            END AS segment
        FROM user_stats
    )
-- Final query using both CTEs
SELECT
    segment,
    count() AS user_count,
    round(avg(total_spent), 2) AS avg_spent,
    round(avg(order_count), 1) AS avg_orders
FROM segmented
GROUP BY segment
ORDER BY avg_spent DESC;
```

## CTEs vs Subqueries in ClickHouse

In ClickHouse, CTEs are typically inlined (not materialized) at query time - meaning they may be re-evaluated each time they are referenced. This is different from some databases that cache CTE results.

```sql
-- CTE referenced multiple times - may be computed twice
WITH expensive_subquery AS (
    SELECT user_id, sum(events) AS total_events
    FROM large_events_table
    GROUP BY user_id
)
SELECT
    a.user_id,
    a.total_events,
    b.total_events AS also_events  -- CTE may run again
FROM expensive_subquery a
JOIN expensive_subquery b ON a.user_id = b.user_id;

-- Better: use a regular subquery or temp table for expensive CTEs
CREATE TABLE temp_user_events ENGINE = Memory AS
SELECT user_id, sum(events) AS total_events
FROM large_events_table
GROUP BY user_id;
```

## CTE with Scalar Values

CTEs can define scalar values, not just tables:

```sql
-- Define constants in CTE
WITH
    cutoff_date AS (SELECT toDate('2024-01-01')),
    max_age AS (SELECT 30)
SELECT *
FROM user_events
WHERE event_date >= (SELECT * FROM cutoff_date)
  AND user_age <= (SELECT * FROM max_age);

-- ClickHouse shorthand for scalar CTEs
WITH
    toDate('2024-01-01') AS cutoff_date,
    30 AS max_age
SELECT *
FROM user_events
WHERE event_date >= cutoff_date
  AND user_age <= max_age;
```

## Recursive CTEs

ClickHouse supports recursive CTEs (added in 24.3):

```sql
-- Recursive CTE example: generate number sequence
WITH RECURSIVE
    numbers AS (
        SELECT 1 AS n          -- base case
        UNION ALL
        SELECT n + 1 FROM numbers WHERE n < 10  -- recursive case
    )
SELECT n FROM numbers;
-- Returns: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

-- Practical recursive: org chart traversal
WITH RECURSIVE
    org_tree AS (
        -- Base: top-level employees (no manager)
        SELECT employee_id, name, manager_id, 1 AS level
        FROM employees
        WHERE manager_id IS NULL
        UNION ALL
        -- Recursive: employees with manager in tree
        SELECT e.employee_id, e.name, e.manager_id, t.level + 1
        FROM employees e
        JOIN org_tree t ON e.manager_id = t.employee_id
        WHERE t.level < 10  -- safety limit
    )
SELECT employee_id, name, level
FROM org_tree
ORDER BY level, name;
```

## CTEs for Readability in Analytics

```sql
-- Complex analytics query broken into readable steps
WITH
    -- Raw event counts per day per country
    daily_events AS (
        SELECT
            toDate(ts) AS day,
            country,
            count() AS events,
            uniq(user_id) AS users
        FROM events
        WHERE ts >= now() - INTERVAL 30 DAY
        GROUP BY day, country
    ),
    -- 7-day rolling averages
    rolling_avg AS (
        SELECT
            day,
            country,
            events,
            users,
            avg(events) OVER (
                PARTITION BY country
                ORDER BY day
                ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
            ) AS events_7d_avg
        FROM daily_events
    )
SELECT
    day,
    country,
    events,
    round(events_7d_avg, 0) AS rolling_avg,
    round(events / events_7d_avg * 100, 1) AS pct_of_avg
FROM rolling_avg
WHERE day >= today() - 7
ORDER BY day, country;
```

## Summary

Common Table Expressions in ClickHouse use the `WITH` clause to define named subqueries that make complex queries more readable and maintainable. Multiple CTEs can be chained together, and scalar values can be defined as constants. Recursive CTEs (available in recent ClickHouse versions) enable hierarchical queries. Note that ClickHouse CTEs are inlined rather than materialized, so frequently referenced expensive CTEs may benefit from being precomputed into temporary tables.

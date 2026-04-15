# How to Optimize Correlated Subqueries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Subquery, Performance, Query Optimization, Correlated Query, Join

Description: Learn how to identify and rewrite correlated subqueries in ClickHouse to eliminate row-by-row execution and dramatically improve query performance.

---

Correlated subqueries reference columns from the outer query, causing them to execute once for each row of the outer query. ClickHouse can optimize some correlated subqueries automatically, but manual rewrites often achieve far better performance.

## What Is a Correlated Subquery?

A correlated subquery references a column from the outer query:

```sql
-- Correlated: references e.user_id from outer query
SELECT
    e.user_id,
    e.event_time
FROM events e
WHERE e.event_time = (
    SELECT max(event_time)
    FROM events
    WHERE user_id = e.user_id  -- references outer e.user_id
);
```

This can execute the inner query once for every row in `events` - potentially millions of times.

## Rewriting with Window Functions

Window functions are the most common solution for "latest per group" patterns:

```sql
-- Use ROW_NUMBER to find the latest event per user
SELECT user_id, event_time
FROM (
    SELECT
        user_id,
        event_time,
        row_number() OVER (PARTITION BY user_id ORDER BY event_time DESC) AS rn
    FROM events
)
WHERE rn = 1;
```

Or with `max`:

```sql
SELECT
    user_id,
    max(event_time) AS latest_event
FROM events
GROUP BY user_id;
```

For retrieving a different column at the latest row, use `argMax`:

```sql
SELECT
    user_id,
    argMax(event_type, event_time) AS latest_event_type
FROM events
GROUP BY user_id;
```

## Rewriting with JOIN

Pre-aggregate the correlated result, then JOIN:

```sql
-- Original correlated query: users with above-average order value
SELECT user_id, order_id, order_value
FROM orders o
WHERE order_value > (
    SELECT avg(order_value)
    FROM orders
    WHERE user_id = o.user_id
);

-- Rewritten as JOIN
SELECT o.user_id, o.order_id, o.order_value
FROM orders o
INNER JOIN (
    SELECT user_id, avg(order_value) AS avg_value
    FROM orders
    GROUP BY user_id
) avg_orders ON o.user_id = avg_orders.user_id
WHERE o.order_value > avg_orders.avg_value;
```

## Rewriting EXISTS as Semi-JOIN

Correlated `EXISTS` subqueries can be rewritten as JOINs:

```sql
-- Correlated EXISTS
SELECT user_id, username
FROM users u
WHERE EXISTS (
    SELECT 1
    FROM orders
    WHERE user_id = u.user_id
      AND order_date >= '2026-01-01'
);

-- Rewritten as semi-join using IN
SELECT user_id, username
FROM users
WHERE user_id IN (
    SELECT user_id
    FROM orders
    WHERE order_date >= '2026-01-01'
);
```

## Using CTEs to Decouple Correlated Logic

Break the correlation by pre-computing the dependent result:

```sql
-- Find products priced above their category average
WITH category_averages AS (
    SELECT category_id, avg(price) AS avg_price
    FROM products
    GROUP BY category_id
)
SELECT p.product_id, p.name, p.price, ca.avg_price
FROM products p
JOIN category_averages ca ON p.category_id = ca.category_id
WHERE p.price > ca.avg_price;
```

## Checking if ClickHouse Decorrelates Automatically

Use EXPLAIN to verify:

```sql
EXPLAIN
SELECT user_id FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders WHERE user_id = u.user_id
);
```

If the plan shows `CreatingSets` or a join step like `HashJoin`, ClickHouse is using set-based or join-based execution. If the plan does not show a join-based strategy for a correlated subquery, you should rewrite it manually.

## Using ARRAY JOIN as an Alternative

For set-based correlations involving arrays, ARRAY JOIN can be more efficient:

```sql
-- Find users who performed all required actions
SELECT user_id
FROM (
    SELECT
        user_id,
        groupArray(action_type) AS actions
    FROM user_actions
    GROUP BY user_id
)
WHERE has(actions, 'signup')
  AND has(actions, 'verified_email')
  AND has(actions, 'first_purchase');
```

## Summary

Correlated subqueries in ClickHouse should be rewritten as JOINs, window functions, or CTEs wherever possible to eliminate row-by-row execution. Use `max`, `argMax`, `ROW_NUMBER`, and pre-aggregated JOIN patterns for "latest/first per group" queries. Always verify your rewrite with EXPLAIN to confirm the plan has improved.

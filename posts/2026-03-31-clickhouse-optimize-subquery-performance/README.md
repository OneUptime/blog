# How to Optimize Subquery Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Subquery, Performance, Query Optimization, Join, IN Clause

Description: Learn how to optimize subquery performance in ClickHouse by rewriting subqueries as JOINs, using IN with set operations, and leveraging query planner hints.

---

Subqueries in ClickHouse can be performance bottlenecks when they execute repeatedly or produce large intermediate results. Understanding how ClickHouse handles subqueries and rewriting them appropriately can yield dramatic speed improvements.

## How ClickHouse Executes Subqueries

ClickHouse evaluates subqueries in the `IN` clause by building a hash set from the inner query result. For subqueries in `FROM` (derived tables), the result is materialized before the outer query runs. Understanding this helps you write efficient subqueries.

## Rewriting IN Subqueries as JOINs

A subquery in `IN` builds a hash table once. When the inner result is large, this works well:

```sql
-- Original: subquery in IN clause
SELECT user_id, event_type, event_time
FROM events
WHERE user_id IN (
    SELECT user_id
    FROM users
    WHERE country = 'US' AND signup_date >= '2026-01-01'
);

-- Rewritten as JOIN (often faster when users table is smaller)
SELECT e.user_id, e.event_type, e.event_time
FROM events e
INNER JOIN users u ON e.user_id = u.user_id
WHERE u.country = 'US'
  AND u.signup_date >= '2026-01-01';
```

## Using Global IN for Distributed Queries

In a distributed environment, a regular `IN` subquery runs on every shard separately. Use `GLOBAL IN` to run it once and broadcast the result:

```sql
-- Bad for distributed: runs subquery on every shard
SELECT * FROM distributed_events
WHERE user_id IN (SELECT user_id FROM users WHERE premium = 1);

-- Good: runs inner query once, broadcasts result
SELECT * FROM distributed_events
WHERE user_id GLOBAL IN (SELECT user_id FROM users WHERE premium = 1);
```

## Organizing Complex Queries with CTEs

CTEs (WITH clause) improve readability when queries involve multiple subqueries. Note that ClickHouse inlines CTEs by default, meaning each reference re-executes the subquery rather than caching the result:

```sql
-- Without CTE: harder to read with nested derived tables
SELECT
    e.user_id,
    e.event_count,
    b.basket_value
FROM (SELECT user_id, count() AS event_count FROM events GROUP BY user_id) e
JOIN (SELECT user_id, sum(value) AS basket_value FROM baskets GROUP BY user_id) b
ON e.user_id = b.user_id;

-- With CTE: same execution behavior, but easier to read and maintain
WITH
    event_counts AS (
        SELECT user_id, count() AS event_count
        FROM events
        GROUP BY user_id
    ),
    basket_values AS (
        SELECT user_id, sum(value) AS basket_value
        FROM baskets
        GROUP BY user_id
    )
SELECT
    e.user_id,
    e.event_count,
    b.basket_value
FROM event_counts e
JOIN basket_values b ON e.user_id = b.user_id;
```

## Avoiding Scalar Subqueries in SELECT

Scalar subqueries in SELECT execute once per row:

```sql
-- Slow: subquery runs for each row
SELECT
    user_id,
    (SELECT max(event_time) FROM events WHERE user_id = u.user_id) AS last_event
FROM users u;

-- Fast: use JOIN instead
SELECT u.user_id, e.last_event
FROM users u
LEFT JOIN (
    SELECT user_id, max(event_time) AS last_event
    FROM events
    GROUP BY user_id
) e ON u.user_id = e.user_id;
```

## Using Materialized Views for Recurring Subqueries

If the same expensive subquery is used frequently, materialize it:

```sql
CREATE MATERIALIZED VIEW premium_user_ids
ENGINE = Set()
AS SELECT user_id FROM users WHERE premium = 1;

-- Now IN is instant - no subquery needed
SELECT * FROM events
WHERE user_id IN premium_user_ids;
```

## Checking Subquery Execution with EXPLAIN

Always verify your subquery plan:

```sql
EXPLAIN
SELECT user_id FROM events
WHERE user_id IN (
    SELECT user_id FROM users WHERE country = 'DE'
);
```

Look for `CreatingSets` in the output - this shows the subquery is being materialized as a hash set.

## Summary

Subquery optimization in ClickHouse involves choosing between `IN` sets, JOINs, and CTEs based on data size and query structure. Use `GLOBAL IN` for distributed queries, rewrite scalar subqueries as JOINs, pre-materialize expensive recurring subqueries as materialized views, and verify plans with EXPLAIN to catch costly full scans.

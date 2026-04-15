# How to Use view() Table Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, view(), Table Function, SQL, Subquery, CTE, Analytics

Description: Learn how to use the view() table function in ClickHouse to wrap a subquery as a named table reference, enabling reuse of complex SQL expressions in FROM clauses.

---

The `view(subquery)` table function in ClickHouse wraps any SELECT statement into an inline table-like reference. It is the functional equivalent of a CTE or inline subquery alias, but expresses the subquery as a function argument. It is particularly useful in contexts where inline subqueries or named CTEs are inconvenient, and it composes naturally with other table functions.

## Basic Syntax

```sql
view(subquery)
```

The `subquery` is any valid SELECT statement. The result acts as a table in a FROM clause.

## Simple Example

```sql
SELECT *
FROM view(
    SELECT event_type, count() AS cnt
    FROM events
    WHERE event_time >= today() - 7
    GROUP BY event_type
)
ORDER BY cnt DESC;
```

## Composing view() with Other Table Functions

`view()` can be combined with `remote()`, `cluster()`, and other table functions:

```sql
-- Use view() to pre-filter before a remote() call
SELECT count()
FROM remote('ch-node-2', view(
    SELECT user_id FROM mydb.users WHERE plan = 'pro'
));
```

## Using view() in JOINs

```sql
SELECT
    e.user_id,
    e.event_count,
    u.plan
FROM view(
    SELECT user_id, count() AS event_count
    FROM events
    WHERE event_time >= today() - 30
    GROUP BY user_id
) AS e
LEFT JOIN view(
    SELECT user_id, plan
    FROM users
    WHERE is_active = 1
) AS u ON e.user_id = u.user_id
ORDER BY e.event_count DESC
LIMIT 20;
```

## Multi-Step Aggregation with view()

The `view()` function is useful for ad hoc multi-step aggregation, breaking complex queries into readable stages:

```sql
-- Multi-step aggregation using view()
SELECT
    region,
    avg(revenue_per_user) AS avg_rev
FROM view(
    SELECT
        u.region,
        u.user_id,
        sum(o.amount) AS revenue_per_user
    FROM users AS u
    LEFT JOIN orders AS o ON u.user_id = o.user_id
    GROUP BY u.region, u.user_id
)
GROUP BY region
ORDER BY avg_rev DESC;
```

## Difference from WITH (CTE)

Both `WITH` clauses and `view()` wrap subqueries, but `view()` is an expression in a FROM clause, while WITH is a named reference:

```sql
-- Using WITH (CTE)
WITH active_users AS (
    SELECT user_id FROM users WHERE is_active = 1
)
SELECT count() FROM events WHERE user_id IN (SELECT user_id FROM active_users);

-- Using view() inline
SELECT count()
FROM events
WHERE user_id IN (
    SELECT user_id FROM view(SELECT user_id FROM users WHERE is_active = 1)
);
```

## Using view() with INSERT INTO

```sql
INSERT INTO summary_table (event_type, cnt, report_date)
SELECT event_type, cnt, today()
FROM view(
    SELECT event_type, count() AS cnt
    FROM events
    WHERE toDate(event_time) = today() - 1
    GROUP BY event_type
);
```

## Named Views vs view() Function

A named `CREATE VIEW` is reusable across sessions:

```sql
CREATE VIEW active_events AS
SELECT * FROM events WHERE is_active = 1;

SELECT count() FROM active_events;
```

The `view()` function is a one-off inline expression - no DDL required, no persistence.

## Summary

The `view()` table function wraps a SELECT statement into an inline table reference, enabling complex multi-step queries and reuse of subquery expressions in FROM clauses. Use it to compose queries with other table functions, wrap subqueries for JOINs, and build readable multi-step pipelines without creating permanent view objects. For recurring queries, a named `CREATE VIEW` or `CREATE MATERIALIZED VIEW` is more maintainable.

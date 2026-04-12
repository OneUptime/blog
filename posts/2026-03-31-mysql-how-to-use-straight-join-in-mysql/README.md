# How to Use STRAIGHT_JOIN in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, STRAIGHT_JOIN, Query Optimization, Join, Optimizer Hint

Description: Learn how STRAIGHT_JOIN forces MySQL to use a specific join order, when to use it to override poor optimizer decisions, and when to avoid it.

---

## What Is STRAIGHT_JOIN

`STRAIGHT_JOIN` is a MySQL-specific JOIN type that forces the optimizer to process tables in the exact left-to-right order they are listed in the query, bypassing the optimizer's automatic join order selection.

By default, MySQL's optimizer reorders tables to find the most efficient join sequence based on statistics. Occasionally the optimizer makes suboptimal choices due to stale statistics or complex conditions, and `STRAIGHT_JOIN` lets you override it.

## Syntax

`STRAIGHT_JOIN` can be used in two ways:

### As a JOIN Type Between Two Tables

```sql
SELECT o.id, c.name, o.total_amount
FROM orders o
STRAIGHT_JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';
```

This forces MySQL to use `orders` as the driving table (outer loop) and `customers` as the inner table, regardless of their sizes or statistics.

### As a SELECT Modifier (Applies to All JOINs)

```sql
SELECT STRAIGHT_JOIN o.id, c.name, p.name AS product
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.status = 'pending';
```

With `SELECT STRAIGHT_JOIN`, MySQL uses the exact table order listed in the `FROM` clause for all joins.

## When the Optimizer Chooses the Wrong Join Order

The optimizer estimates the cost of each join order based on table statistics. It can make poor choices when:
- Table statistics are stale (run `ANALYZE TABLE` to fix this first).
- A complex WHERE clause makes selectivity hard to estimate.
- Subqueries or derived tables confuse the cardinality estimates.

### Diagnosing with EXPLAIN

```sql
-- Check what order MySQL is choosing
EXPLAIN SELECT o.id, c.name
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'pending' AND c.region = 'north';
```

If EXPLAIN shows MySQL is using `customers` as the outer table but there are millions of customers and only a few hundred `pending` orders, forcing `orders` as the driver may be faster:

```sql
EXPLAIN SELECT o.id, c.name
FROM orders o
STRAIGHT_JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending' AND c.region = 'north';
```

## Practical Example

```sql
-- orders: 10 million rows, status = 'pending' returns 500 rows
-- customers: 200,000 rows, region = 'north' returns 50,000 rows

-- Optimizer might pick customers as driver (large inner, small filter)
-- STRAIGHT_JOIN forces orders as driver (small result set after filter)

SELECT STRAIGHT_JOIN
  o.id,
  o.total_amount,
  c.name,
  c.email
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending'  -- Very selective: 500 rows
  AND c.region = 'north';
```

With `orders` as the driver (500 pending rows) and `customers` as the inner (index lookup by `c.id`), this requires only 500 index lookups on customers - much faster than scanning 50,000 north-region customers and joining to orders.

## STRAIGHT_JOIN vs Optimizer Hints

MySQL 8 provides optimizer hints as a cleaner alternative to `STRAIGHT_JOIN`:

```sql
-- Using JOIN_ORDER hint (preferred in MySQL 8)
SELECT /*+ JOIN_ORDER(o, c) */
  o.id, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';
```

The `JOIN_ORDER` hint is more flexible because it only affects the specific query without changing the JOIN keyword syntax.

## When NOT to Use STRAIGHT_JOIN

- When statistics are simply stale - run `ANALYZE TABLE` instead.
- For queries where the optimal order changes based on parameter values.
- When it locks in a join order that may become suboptimal as data grows.

`STRAIGHT_JOIN` is a last resort, not a first tool. Always update statistics and try other hints (`USE INDEX`, `FORCE INDEX`) before resorting to `STRAIGHT_JOIN`.

## Checking If STRAIGHT_JOIN Helped

Compare execution with and without:

```bash
# Time without STRAIGHT_JOIN
time mysql -u root -p myapp -e "SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'pending'" > /dev/null

# Time with STRAIGHT_JOIN
time mysql -u root -p myapp -e "SELECT STRAIGHT_JOIN o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'pending'" > /dev/null
```

Or use `EXPLAIN ANALYZE` to compare actual execution times.

## Summary

`STRAIGHT_JOIN` forces MySQL to use the exact table order specified in the query, overriding the optimizer's join order selection. Use it when the optimizer consistently chooses a suboptimal join order after refreshing statistics with `ANALYZE TABLE`. For MySQL 8, the `/*+ JOIN_ORDER() */` optimizer hint is the preferred modern alternative, as it is more explicit and does not change the JOIN syntax. Always validate the improvement with `EXPLAIN ANALYZE` before relying on either technique.

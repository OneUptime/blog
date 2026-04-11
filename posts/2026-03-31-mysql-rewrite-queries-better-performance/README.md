# How to Rewrite Queries for Better Performance in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Optimization, Performance, SQL, REWRITE

Description: Learn practical techniques for rewriting MySQL queries to improve performance, covering index usage, subquery elimination, and join optimization.

---

## Overview

MySQL query performance often depends less on the data volume and more on how the query is written. A poorly-written query can take minutes; the same logical operation rewritten correctly takes milliseconds. This guide covers the most impactful rewrite patterns with before-and-after examples.

## Use EXPLAIN Before and After

Always benchmark rewrites with EXPLAIN to verify improvements:

```sql
-- Check execution plan
EXPLAIN SELECT * FROM orders WHERE YEAR(created_at) = 2024;

-- Check with format=JSON for cost estimates
EXPLAIN FORMAT=JSON SELECT * FROM orders WHERE YEAR(created_at) = 2024;
```

## Pattern 1: Avoid Functions on Indexed Columns

Wrapping an indexed column in a function prevents index usage.

```sql
-- SLOW: Function prevents index usage on created_at
SELECT * FROM orders WHERE YEAR(created_at) = 2024;

-- FAST: Range condition uses the index
SELECT * FROM orders
WHERE created_at >= '2024-01-01'
  AND created_at < '2025-01-01';
```

## Pattern 2: Replace Subqueries with JOINs

Correlated subqueries execute once per row; equivalent JOINs execute once total.

```sql
-- SLOW: Correlated subquery runs for each row in orders
SELECT id, customer_id, amount
FROM orders o
WHERE amount > (
    SELECT AVG(amount)
    FROM orders
    WHERE customer_id = o.customer_id
);

-- FAST: Pre-aggregate with JOIN
SELECT o.id, o.customer_id, o.amount
FROM orders o
JOIN (
    SELECT customer_id, AVG(amount) AS avg_amount
    FROM orders
    GROUP BY customer_id
) avg_orders ON o.customer_id = avg_orders.customer_id
WHERE o.amount > avg_orders.avg_amount;
```

## Pattern 3: Rewrite OR to UNION ALL for Index Usage

OR conditions on different indexed columns often prevent efficient index use.

```sql
-- POTENTIALLY SLOW: OR may prevent index usage
SELECT * FROM users
WHERE email = 'alice@example.com'
   OR phone = '555-1234';

-- FAST: Each branch uses its own index
SELECT * FROM users WHERE email = 'alice@example.com'
UNION ALL
SELECT * FROM users WHERE phone = '555-1234'
  AND (email != 'alice@example.com' OR email IS NULL); -- Prevent duplicates
```

## Pattern 4: Replace NOT IN with LEFT JOIN IS NULL

`NOT IN` handles NULL values differently from `NOT EXISTS` or `LEFT JOIN IS NULL`.

```sql
-- SLOW: NOT IN does not use indexes well, and fails with NULLs
SELECT id FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);

-- FAST: LEFT JOIN anti-join pattern
SELECT c.id
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.customer_id IS NULL;
```

## Pattern 5: Push Predicates Inside Derived Tables

Moving filter conditions into subqueries reduces the rows processed.

```sql
-- SLOW: Filter applied after full aggregation
SELECT *
FROM (
    SELECT customer_id, SUM(amount) AS total
    FROM orders
    GROUP BY customer_id
) summary
WHERE total > 1000;

-- FAST: Eliminate the derived table with HAVING
-- (derived_merge cannot optimize derived tables with GROUP BY):
SELECT customer_id, SUM(amount) AS total
FROM orders
GROUP BY customer_id
HAVING total > 1000;
```

## Pattern 6: Use Covering Indexes

A covering index satisfies the query entirely from the index without accessing the table:

```sql
-- Query needs only customer_id, status, and amount
-- Create a covering index
CREATE INDEX idx_covering ON orders (customer_id, status, amount);

-- This query is now satisfied entirely from the index
SELECT customer_id, status, SUM(amount) AS total
FROM orders
WHERE customer_id = 42
  AND status = 'completed'
GROUP BY customer_id, status;
```

Verify with EXPLAIN - look for "Using index" in the Extra column.

## Pattern 7: Limit Early with WHERE Before GROUP BY

```sql
-- SLOW: Groups all rows then filters
SELECT customer_id, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
HAVING order_count > 10
  AND customer_id IN (SELECT id FROM customers WHERE region = 'US');

-- FAST: Filter before grouping reduces rows processed
SELECT o.customer_id, COUNT(*) AS order_count
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE c.region = 'US'
GROUP BY o.customer_id
HAVING order_count > 10;
```

## Summary

The most impactful MySQL query rewrites focus on enabling index usage - avoid wrapping indexed columns in functions, rewrite OR conditions that span different indexes as UNION ALL, and use LEFT JOIN anti-joins instead of NOT IN. Replace correlated subqueries with aggregated JOINs to avoid per-row subquery execution. Always verify rewrites with EXPLAIN to confirm the optimizer chooses the expected plan, and measure actual query execution time before and after to confirm the improvement.

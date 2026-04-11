# How to Optimize SELECT Queries in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Optimization, Index, Performance

Description: Learn practical techniques to optimize MySQL SELECT queries including proper indexing, avoiding SELECT *, limiting result sets, and rewriting inefficient patterns.

---

## Why SELECT Query Optimization Matters

SELECT is the most common operation in most MySQL databases. Poorly optimized SELECT queries can consume excessive CPU, memory, and I/O, slowing down every other operation on the server. Most SELECT performance problems fall into a small number of repeatable patterns that are straightforward to fix.

## Start with EXPLAIN

Before optimizing anything, use EXPLAIN to understand the current execution plan:

```sql
EXPLAIN SELECT customer_id, SUM(total) FROM orders
WHERE status = 'completed'
GROUP BY customer_id
ORDER BY SUM(total) DESC
LIMIT 20;
```

Look for: `type: ALL`, `key: NULL`, `Extra: Using filesort`, `Extra: Using temporary`.

## Avoid SELECT *

Fetching all columns forces MySQL to read full rows from disk even when only a few columns are needed:

```sql
-- Slow: fetches all columns
SELECT * FROM products WHERE category_id = 5;

-- Fast: fetches only needed columns (can use covering index)
SELECT id, name, price FROM products WHERE category_id = 5;
```

A covering index on `(category_id, id, name, price)` means MySQL never touches the main table.

## Add Indexes for WHERE and ORDER BY Columns

```sql
-- Query filtering and sorting on unindexed columns
EXPLAIN SELECT id, name FROM customers WHERE city = 'London' ORDER BY last_name;
-- type: ALL, Using filesort

-- Create composite index matching filter + sort order
CREATE INDEX idx_city_lastname ON customers(city, last_name);

EXPLAIN SELECT id, name FROM customers WHERE city = 'London' ORDER BY last_name;
-- type: ref, Using index condition
```

## Use LIMIT to Restrict Results

Even with an index, returning millions of rows wastes bandwidth and client memory:

```sql
-- Always paginate large result sets
SELECT id, name, email FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

For deep pagination (large OFFSET values), use keyset pagination instead:

```sql
-- Instead of LIMIT 10000, 20 (slow)
-- Use the last seen ID from the previous page
SELECT id, name FROM products
WHERE id > 10000
ORDER BY id
LIMIT 20;
```

## Avoid Functions on Indexed Columns in WHERE

Wrapping an indexed column in a function prevents index use:

```sql
-- Cannot use index on created_at
SELECT * FROM orders WHERE YEAR(created_at) = 2025;

-- Can use index
SELECT * FROM orders
WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01';
```

## Rewrite Correlated Subqueries as JOINs

Correlated subqueries re-execute for every row in the outer query:

```sql
-- Slow: correlated subquery runs once per order row
SELECT id, (SELECT name FROM customers WHERE id = o.customer_id) AS cname
FROM orders o;

-- Fast: single join
SELECT o.id, c.name AS cname
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id;
```

## Use WHERE Instead of HAVING for Filtering

`HAVING` filters after aggregation; `WHERE` filters before. Use WHERE to reduce the number of rows processed:

```sql
-- Less efficient: aggregates all rows then filters
SELECT customer_id, COUNT(*) FROM orders
GROUP BY customer_id
HAVING customer_id > 1000;

-- More efficient: filters rows before aggregation
SELECT customer_id, COUNT(*) FROM orders
WHERE customer_id > 1000
GROUP BY customer_id;
```

## Summary

Optimizing MySQL SELECT queries comes down to a few core principles: always check EXPLAIN first, never fetch more data than needed, ensure your WHERE and ORDER BY columns have appropriate indexes, and avoid patterns that prevent index use like functions on indexed columns. Apply these techniques consistently and your query response times will drop significantly.

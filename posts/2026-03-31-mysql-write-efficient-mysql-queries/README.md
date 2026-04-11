# How to Write Efficient MySQL Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Performance, Index, Optimization

Description: Learn practical techniques for writing efficient MySQL queries by understanding execution plans, using indexes correctly, and avoiding common performance pitfalls.

---

Slow queries are the most common cause of MySQL performance problems. Writing efficient queries requires understanding how the optimizer chooses execution plans, how indexes are used, and which query patterns force full table scans.

## Use EXPLAIN to Understand Execution Plans

Always analyze queries with `EXPLAIN` before deploying to production:

```sql
EXPLAIN SELECT o.id, o.amount, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
  AND o.created_at > '2026-01-01';
```

Focus on the `type` column. The values from best to worst are: `system`, `const`, `eq_ref`, `ref`, `range`, `index`, and `ALL`. Any query with `ALL` on a large table needs an index.

## Add Indexes on Filter and Join Columns

If a WHERE clause column is not indexed, MySQL scans every row:

```sql
-- Add a composite index that covers both filter columns
ALTER TABLE orders ADD INDEX idx_status_created (status, created_at);

-- Verify the index is used
EXPLAIN SELECT * FROM orders
WHERE status = 'pending' AND created_at > '2026-01-01';
```

The leftmost column in the index must match the leading filter. A composite index on `(status, created_at)` cannot accelerate a query that filters only on `created_at`.

## Avoid Functions on Indexed Columns

Wrapping a column in a function prevents index use:

```sql
-- Bad: full table scan despite index on created_at
SELECT * FROM orders WHERE YEAR(created_at) = 2026;

-- Good: range scan uses the index
SELECT * FROM orders
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
```

## Use Covering Indexes for Read-Heavy Queries

A covering index includes all columns referenced by a query, eliminating the need to access the table rows:

```sql
-- Query references status, created_at, id, and amount
ALTER TABLE orders ADD INDEX idx_covering (status, created_at, id, amount);

SELECT id, amount FROM orders
WHERE status = 'shipped' AND created_at > '2026-03-01';
```

`EXPLAIN` will show `Using index` in the Extra column when a covering index is in use.

## Paginate with Keyset Rather Than OFFSET

`LIMIT ... OFFSET` scans and discards rows, getting slower as the offset grows:

```sql
-- Slow for large offsets
SELECT id, amount FROM orders ORDER BY id LIMIT 20 OFFSET 10000;

-- Fast: keyset pagination uses the primary key index
SELECT id, amount FROM orders
WHERE id > 10000
ORDER BY id
LIMIT 20;
```

## Prefer EXISTS Over COUNT for Existence Checks

```sql
-- Counts all matching rows before returning
SELECT COUNT(*) FROM orders WHERE customer_id = 42;

-- Stops at the first match
SELECT EXISTS(SELECT 1 FROM orders WHERE customer_id = 42);
```

## Limit Result Sets Early

Fetch only the rows and columns you need:

```sql
-- Retrieve specific columns, not SELECT *
SELECT id, status, amount FROM orders
WHERE customer_id = 42
ORDER BY created_at DESC
LIMIT 10;
```

## Summary

Efficient MySQL queries come from understanding the optimizer and using indexes correctly. Run `EXPLAIN` on every significant query, avoid applying functions to indexed columns, use covering indexes for high-frequency reads, and replace `OFFSET` pagination with keyset pagination on large datasets. These habits eliminate full table scans and keep response times consistent as data grows.

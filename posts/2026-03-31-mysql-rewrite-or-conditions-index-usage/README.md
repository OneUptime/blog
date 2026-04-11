# How to Rewrite OR Conditions for Better Index Usage in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Optimization, Index, OR Condition, UNION

Description: Learn how to rewrite MySQL OR conditions as UNION queries to enable better index usage and dramatically improve query performance on indexed columns.

---

## Overview

OR conditions in WHERE clauses are a common source of poor MySQL query performance. When OR connects conditions on different columns, the optimizer may not use indexes efficiently and instead resort to a full table scan. Rewriting these as UNION queries often enables each branch to use its own optimal index.

## Why OR Hurts Index Performance

Consider a table with separate indexes on `email` and `phone`:

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(255),
    phone VARCHAR(20),
    name VARCHAR(100),
    INDEX idx_email (email),
    INDEX idx_phone (phone)
);

-- Check how OR is handled
EXPLAIN SELECT id, name
FROM users
WHERE email = 'alice@example.com'
   OR phone = '555-1234';
```

The EXPLAIN output may show `type: index_merge` (if MySQL uses the Index Merge optimization) or `type: ALL` (full table scan). Index Merge has overhead and is not always chosen.

## The UNION ALL Rewrite

Splitting OR into UNION ALL lets each branch use its own index independently:

```sql
-- Before: OR condition
SELECT id, name
FROM users
WHERE email = 'alice@example.com'
   OR phone = '555-1234';

-- After: UNION ALL with deduplication
SELECT id, name
FROM users
WHERE email = 'alice@example.com'
UNION ALL
SELECT id, name
FROM users
WHERE phone = '555-1234'
  AND (email != 'alice@example.com' OR email IS NULL);
```

Or use UNION (not UNION ALL) to automatically remove duplicates:

```sql
SELECT id, name FROM users WHERE email = 'alice@example.com'
UNION
SELECT id, name FROM users WHERE phone = '555-1234';
```

## Verifying the Improvement

```sql
-- Check execution plans for both queries
EXPLAIN SELECT id, name FROM users
WHERE email = 'alice@example.com'
UNION
SELECT id, name FROM users WHERE phone = '555-1234';
```

Look for `type: ref` or `type: eq_ref` in each SELECT - these indicate index usage.

## OR on the Same Column

When OR applies to the same column, the optimizer typically handles it well using an index range scan:

```sql
-- Same column OR - optimizer usually handles this fine
SELECT * FROM orders
WHERE status = 'pending'
   OR status = 'processing';

-- Equivalent and often cleaner:
SELECT * FROM orders WHERE status IN ('pending', 'processing');
```

`IN` is functionally equivalent to OR on a single column and is generally preferable for readability.

## OR in JOIN Conditions

OR in JOIN conditions is particularly damaging to performance:

```sql
-- VERY SLOW: OR in JOIN condition prevents index use
SELECT p.id, p.name, oi.order_id
FROM products p
JOIN order_items oi ON p.id = oi.product_id
                    OR p.sku = oi.product_sku;

-- FAST: UNION approach
SELECT p.id, p.name, oi.order_id
FROM products p
JOIN order_items oi ON p.id = oi.product_id
UNION
SELECT p.id, p.name, oi.order_id
FROM products p
JOIN order_items oi ON p.sku = oi.product_sku
  AND (p.id != oi.product_id OR oi.product_id IS NULL);
```

## Using Index Merge Hints

If you prefer to keep the OR condition, you can hint at Index Merge (MySQL 8.0.20+):

```sql
-- Hint to force index merge optimization
SELECT /*+ INDEX_MERGE(users idx_email, idx_phone) */ id, name
FROM users
WHERE email = 'alice@example.com'
   OR phone = '555-1234';
```

## Benchmarking the Rewrite

Use `EXPLAIN ANALYZE` (MySQL 8.0.18+) to measure actual execution times:

```sql
-- Compare actual execution costs
EXPLAIN ANALYZE
SELECT id, name FROM users WHERE email = 'alice@example.com'
UNION
SELECT id, name FROM users WHERE phone = '555-1234';
```

## Summary

OR conditions on different indexed columns often prevent MySQL from using indexes efficiently. The UNION ALL rewrite pattern splits each OR branch into a separate SELECT that can independently use its optimal index. This is most beneficial when OR spans different columns with separate indexes and the table is large. For OR conditions on the same column, use IN instead. Always validate improvements with EXPLAIN and EXPLAIN ANALYZE before deploying query rewrites to production.

# How to Use the Hash Join Algorithm in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Query, Optimization, Index

Description: Learn how MySQL 8.0's hash join algorithm speeds up equi-join queries on large tables that lack index support.

---

## What Is Hash Join?

Before MySQL 8.0.18, MySQL's join algorithm was exclusively nested-loop. For every row in the outer table, MySQL scanned the inner table - O(n*m) without indexes. MySQL 8.0.18 introduced the hash join algorithm, which is significantly faster for equi-joins when indexes are unavailable or not beneficial.

Hash join works in two phases:
1. **Build phase** - MySQL reads the smaller table and builds an in-memory hash table keyed on the join column.
2. **Probe phase** - MySQL scans the larger table and probes the hash table for matching rows.

## When MySQL Uses Hash Join

MySQL automatically selects hash join when:
- The join uses equality conditions (`=`)
- No usable index exists on the join columns
- The optimizer estimates hash join is cheaper than nested-loop

```sql
-- Create tables without indexes on join columns
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    region_code CHAR(3)
);

CREATE TABLE regions (
    code CHAR(3),
    name VARCHAR(100)
);

-- Hash join will be used here since region_code has no index
SELECT c.name, r.name AS region
FROM customers c
JOIN regions r ON c.region_code = r.code;
```

## Confirming Hash Join with EXPLAIN

```sql
EXPLAIN FORMAT=TREE
SELECT c.name, r.name AS region
FROM customers c
JOIN regions r ON c.region_code = r.code;
```

Look for `Hash Join` in the output:

```text
-> Hash join  (cost=...)
    -> Table scan on r
    -> Table scan on c
```

You can also use `EXPLAIN ANALYZE` for actual runtime statistics:

```sql
EXPLAIN ANALYZE
SELECT c.name, r.name AS region
FROM customers c
JOIN regions r ON c.region_code = r.code;
```

## Controlling Hash Join Behavior

You can control hash join via the optimizer switch. Note that the `hash_join` flag only worked in MySQL 8.0.18. From MySQL 8.0.19 onward, use the `block_nested_loop` flag instead, which controls hash join behavior (block nested-loop join itself was removed in 8.0.20):

```sql
-- Disable hash join globally (MySQL 8.0.19+)
SET optimizer_switch = 'block_nested_loop=off';

-- Re-enable hash join globally
SET optimizer_switch = 'block_nested_loop=on';

-- Disable hash join for a single query using optimizer hint (MySQL 8.0.20+)
SELECT /*+ NO_BNL(c, r) */ c.name, r.name AS region
FROM customers c
JOIN regions r ON c.region_code = r.code;

-- Encourage hash join for a single query
SELECT /*+ BNL(c, r) */ c.name, r.name AS region
FROM customers c
JOIN regions r ON c.region_code = r.code;
```

## Memory Management

Hash join uses the `join_buffer_size` memory buffer. If the hash table exceeds this, MySQL spills to disk:

```sql
-- Check current buffer size (default: 256KB, can increase for large joins)
SHOW VARIABLES LIKE 'join_buffer_size';

-- Increase for the current session
SET SESSION join_buffer_size = 64 * 1024 * 1024;  -- 64MB
```

To check if a hash join spilled to disk, use `EXPLAIN ANALYZE` which shows actual execution details including spill information in the output:

```sql
EXPLAIN ANALYZE
SELECT c.name, r.name AS region
FROM customers c
JOIN regions r ON c.region_code = r.code;
```

## Multi-Table Hash Joins

Hash join supports multi-table scenarios:

```sql
EXPLAIN FORMAT=TREE
SELECT o.id, c.name, p.name AS product
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id
WHERE o.created_at > '2025-01-01';
```

## Summary

The hash join algorithm in MySQL 8.0 fills an important gap in MySQL's query execution engine. For equi-joins on non-indexed columns or for analytical queries scanning large datasets, hash join dramatically reduces execution time compared to nested-loop joins. Use `EXPLAIN FORMAT=TREE` to verify it is being used, and tune `join_buffer_size` to keep the hash table in memory for the best performance.

# How to Optimize ORDER BY Performance in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Index, Optimization, Performance

Description: Learn how to eliminate filesort and improve MySQL ORDER BY performance by designing composite indexes that match your sort and filter columns.

---

## Why ORDER BY Can Be Slow

When MySQL cannot use an index to retrieve rows in sorted order, it must sort all matching rows in memory or on disk after fetching them. This is shown as `Using filesort` in EXPLAIN. For large result sets, filesort is expensive in both CPU time and memory.

## Detecting the Problem

```sql
EXPLAIN SELECT id, name, created_at FROM customers ORDER BY created_at DESC;
```

```text
type: ALL, key: NULL, rows: 500000, Extra: Using filesort
```

No index is used, and MySQL sorts half a million rows.

## Simple Fix: Index the ORDER BY Column

```sql
CREATE INDEX idx_created_at ON customers(created_at);

EXPLAIN SELECT id, name, created_at FROM customers ORDER BY created_at DESC;
-- type: index, key: idx_created_at, Extra: Backward index scan
```

MySQL reads the index in reverse order to return rows already sorted, avoiding `Using filesort`.

## Composite Index: WHERE + ORDER BY

The most common pattern is filtering with WHERE and then sorting. The index must cover both in the right column order:

```sql
-- Query filters by status then sorts by created_at
SELECT id, email FROM users WHERE status = 'active' ORDER BY created_at DESC;

-- Create composite index: filter column first, sort column second
CREATE INDEX idx_status_created ON users(status, created_at);

EXPLAIN SELECT id, email FROM users WHERE status = 'active' ORDER BY created_at DESC;
-- type: ref, key: idx_status_created, Extra: Using index condition
-- No filesort!
```

## Descending Index (MySQL 8.0+)

Before MySQL 8.0, the `DESC` keyword in index definitions was accepted but ignored. MySQL could scan any index backwards for single-direction sorts, but mixed-direction multi-column sorts (e.g., `ORDER BY a ASC, b DESC`) required filesort. MySQL 8.0 introduced true descending indexes that store entries in descending order, solving mixed-direction sorts:

```sql
-- MySQL 8.0+: explicitly specify DESC in the index
CREATE INDEX idx_status_created_desc ON users(status ASC, created_at DESC);

EXPLAIN SELECT id FROM users WHERE status = 'active' ORDER BY created_at DESC;
-- No filesort, uses index direction
```

## Mixed Sort Directions

Mixing ASC and DESC in a multi-column ORDER BY often causes filesort in older versions:

```sql
-- Problematic in MySQL 5.7
SELECT * FROM orders ORDER BY customer_id ASC, total DESC;
-- Extra: Using filesort

-- MySQL 8.0 solution: match index directions
CREATE INDEX idx_cust_total ON orders(customer_id ASC, total DESC);
EXPLAIN SELECT * FROM orders ORDER BY customer_id ASC, total DESC;
-- Uses index, no filesort
```

## Covering Index for Best Performance

If the SELECT columns are all in the index, MySQL never touches the main table:

```sql
-- Query needs: id, name, created_at - filter on status
SELECT id, name, created_at FROM users WHERE status = 'active' ORDER BY created_at;

-- Covering index: includes all SELECT and WHERE columns
CREATE INDEX idx_status_created_covering ON users(status, created_at, id, name);

EXPLAIN SELECT id, name, created_at FROM users WHERE status = 'active' ORDER BY created_at;
-- type: ref, Extra: Using index (covering - no table lookup needed)
```

## Tuning sort_buffer_size

When filesort is unavoidable (expressions, complex joins), keep it in memory:

```sql
-- Check current size
SHOW VARIABLES LIKE 'sort_buffer_size';

-- Increase for session
SET SESSION sort_buffer_size = 8388608;  -- 8MB
```

Monitor with:

```sql
SHOW GLOBAL STATUS LIKE 'Sort_merge_passes';
-- High values indicate sorts spilling to disk
```

## Summary

Optimizing ORDER BY in MySQL means designing indexes that let the optimizer read rows in the desired sorted order without a separate sorting step. The rule is: put equality-filter columns first in the composite index, followed by the sort column. In MySQL 8.0, use descending indexes for DESC sorts. When filesort cannot be avoided, ensure your `sort_buffer_size` is large enough to keep the operation in memory.

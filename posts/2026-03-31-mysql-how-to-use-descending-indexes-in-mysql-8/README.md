# How to Use Descending Indexes in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Descending Index, Index, Query Optimization

Description: Descending indexes in MySQL 8.0 store index entries in descending order, eliminating costly filesort operations for queries that sort results in descending order.

---

## Overview

Descending indexes were introduced as a fully functional feature in MySQL 8.0. While MySQL 5.7 and earlier allowed the `DESC` keyword in index definitions, it was silently ignored - the index was stored in ascending order regardless. MySQL 8.0 stores DESC index columns in actual descending order on disk.

This matters for queries that use `ORDER BY column DESC` - a descending index allows MySQL to scan the index in forward order while returning rows in descending order, eliminating the need for a reverse scan or an extra filesort step.

## Creating a Descending Index

```sql
-- Single-column descending index
CREATE TABLE events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(50),
  created_at DATETIME,
  INDEX idx_created_desc (created_at DESC)
);

-- Or add to existing table
ALTER TABLE events
ADD INDEX idx_created_desc (created_at DESC);
```

## Composite Index with Mixed Sort Order

The most powerful use case is a composite index where columns have different sort directions:

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT,
  total DECIMAL(10,2),
  created_at DATETIME
);

-- This index matches ORDER BY customer_id ASC, total DESC
ALTER TABLE orders
ADD INDEX idx_cust_total_desc (customer_id ASC, total DESC);
```

## Why Descending Indexes Matter for Mixed Sorts

```sql
-- Without a matching index, this requires a filesort
SELECT customer_id, total FROM orders
ORDER BY customer_id ASC, total DESC;
-- EXPLAIN Extra: Using filesort

-- With idx_cust_total_desc (customer_id ASC, total DESC):
-- EXPLAIN Extra: Using index (no filesort!)
```

## Verifying the Optimizer Uses the Descending Index

```sql
-- Check EXPLAIN for filesort elimination
EXPLAIN SELECT id, created_at FROM events
ORDER BY created_at DESC
LIMIT 10\G

-- Look for:
-- key: idx_created_desc
-- Extra: (no "Using filesort")
```

## Practical Example: Latest Records Per Group

```sql
-- Get the latest order per customer, limited to 5 results
CREATE INDEX idx_cust_created_desc ON orders (customer_id, created_at DESC);

SELECT customer_id, id, total, created_at
FROM orders o
WHERE created_at = (
  SELECT MAX(created_at)
  FROM orders
  WHERE customer_id = o.customer_id
)
ORDER BY customer_id ASC, created_at DESC
LIMIT 5;
```

## When to Use Descending Indexes

Use descending indexes when:
1. Queries consistently sort a column in DESC order
2. You have a composite index where columns sort in different directions
3. Pagination queries always fetch the latest records first

```sql
-- Common pagination pattern - benefits from DESC index
SELECT * FROM events
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

## Index Usage for Reverse Scans

A standard ascending index can be scanned in reverse (backward scan) but this is less efficient. For very large datasets, a native descending index performs better.

```sql
-- MySQL can scan ascending index in reverse but prefers DESC index for this
EXPLAIN SELECT * FROM events ORDER BY created_at DESC LIMIT 100\G
-- With idx_created_desc: type=index, rows ~100 (efficient)
-- Without it: backward scan, slightly less efficient
```

## Checking Index Sort Order

```sql
-- View index definitions including sort direction
SELECT index_name, column_name, collation
FROM information_schema.statistics
WHERE table_schema = 'mydb'
AND table_name = 'events'
ORDER BY index_name, seq_in_index;

-- collation: A = Ascending, D = Descending
```

## Summary

Descending indexes in MySQL 8.0 genuinely store keys in descending order, enabling efficient ORDER BY column DESC queries without filesort overhead. They are most valuable in composite indexes where columns have mixed ASC/DESC sort requirements. Use EXPLAIN to verify that the optimizer eliminates filesort operations after adding a descending index.

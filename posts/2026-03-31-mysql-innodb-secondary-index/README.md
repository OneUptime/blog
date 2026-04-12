# How to Understand InnoDB Secondary Indexes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Index, Secondary Index, Query Optimization

Description: Learn how InnoDB secondary indexes work, how they reference the clustered index, and how to design them for optimal query performance.

---

Secondary indexes in InnoDB are separate B-tree structures that provide alternative access paths to table data. Unlike the clustered index that contains the actual row data, secondary index leaf nodes store the indexed column values plus the primary key of the corresponding row. Understanding this structure is essential for writing efficient queries.

## How Secondary Indexes Are Structured

A secondary index leaf node contains:
1. The indexed column(s) value
2. The primary key value (used to fetch the full row from the clustered index)

```sql
-- Create secondary indexes
CREATE TABLE orders (
    order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    status ENUM('pending','shipped','delivered'),
    created_at DATETIME,
    total DECIMAL(10,2)
);

CREATE INDEX idx_customer ON orders (customer_id);
CREATE INDEX idx_status_date ON orders (status, created_at);
```

When MySQL uses `idx_customer` to find orders for customer 42, it:
1. Traverses the secondary index B-tree to find entries where `customer_id = 42`
2. Reads the `order_id` values from those leaf nodes
3. For each `order_id`, traverses the clustered index to fetch the full row

This second traversal is called a "double lookup" or "bookmark lookup."

## Avoiding Double Lookups with Covering Indexes

A covering index includes all columns needed by the query, eliminating the need for a clustered index lookup:

```sql
-- Without covering index: double lookup required
EXPLAIN SELECT order_id, customer_id, created_at
FROM orders WHERE customer_id = 42;
-- Uses idx_customer, then fetches rows from clustered index

-- With covering index: single index traversal
CREATE INDEX idx_customer_covering
    ON orders (customer_id, created_at, order_id);

EXPLAIN SELECT order_id, customer_id, created_at
FROM orders WHERE customer_id = 42;
-- Shows "Using index" in Extra column - no clustered index lookup needed
```

```sql
-- Check if covering index is used
EXPLAIN FORMAT=TREE
SELECT order_id, customer_id, created_at
FROM orders
WHERE customer_id = 42
ORDER BY created_at DESC;
```

## Index Selectivity

High selectivity indexes are more effective - they narrow down the result set more:

```sql
-- Check cardinality (higher = more selective)
SELECT INDEX_NAME, CARDINALITY
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'orders';

-- Calculate selectivity manually
SELECT
    COUNT(DISTINCT customer_id) / COUNT(*) AS customer_selectivity,
    COUNT(DISTINCT status) / COUNT(*) AS status_selectivity
FROM orders;
```

`status` with few distinct values (low selectivity) is a poor lead column for an index. Use it as a secondary column or combine it with a high-selectivity column.

## Composite Index Design

The order of columns in a composite index matters significantly:

```sql
-- Good: high-selectivity column first
CREATE INDEX idx_customer_status ON orders (customer_id, status);

-- These queries can use the index:
-- WHERE customer_id = 42
-- WHERE customer_id = 42 AND status = 'shipped'

-- This query CANNOT use the index efficiently:
-- WHERE status = 'shipped' (leftmost prefix rule)
```

## Monitoring Secondary Index Usage

```sql
-- Find indexes that are never used (MySQL 8.0+)
SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE INDEX_NAME IS NOT NULL
  AND COUNT_STAR = 0
  AND OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema')
ORDER BY OBJECT_SCHEMA, OBJECT_NAME;

-- Find tables with no indexes (full scans only)
SELECT t.TABLE_SCHEMA, t.TABLE_NAME
FROM information_schema.TABLES t
WHERE t.TABLE_SCHEMA NOT IN ('mysql','information_schema','performance_schema')
  AND NOT EXISTS (
      SELECT 1
      FROM information_schema.STATISTICS s
      WHERE s.TABLE_SCHEMA = t.TABLE_SCHEMA
        AND s.TABLE_NAME = t.TABLE_NAME
  );
```

## Secondary Indexes and the Primary Key Size

Because every secondary index stores the primary key, a large primary key increases the size of every secondary index. A `BIGINT` primary key (8 bytes) is much more efficient than a `CHAR(36)` UUID (36 bytes):

```sql
-- Estimate index size impact
SELECT INDEX_NAME, STAT_VALUE * 16 AS size_kb
FROM mysql.innodb_index_stats
WHERE DATABASE_NAME = 'mydb' AND TABLE_NAME = 'orders'
  AND STAT_NAME = 'size';
```

## Summary

InnoDB secondary indexes store indexed column values plus the primary key in B-tree leaf nodes. Queries using secondary indexes typically require a double lookup - one traversal of the secondary index and another of the clustered index. Use covering indexes to eliminate double lookups. Design composite indexes with the most selective column first and monitor unused indexes with `performance_schema.table_io_waits_summary_by_index_usage`.

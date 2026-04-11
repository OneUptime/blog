# What Is Partitioning in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partitioning, Performance, Large Table, InnoDB

Description: MySQL partitioning divides a large table into smaller physical segments based on a partitioning expression, enabling partition pruning and easier data lifecycle management.

---

## Overview

Partitioning in MySQL splits a single logical table into multiple physical storage units called partitions. To the application, a partitioned table appears and behaves like a normal table, but MySQL can limit queries to only the relevant partitions (partition pruning), which dramatically reduces I/O for large datasets. Partitioning also simplifies data lifecycle management, since dropping an old partition is much faster than deleting millions of rows.

MySQL supports several partitioning types: RANGE, LIST, HASH, KEY, and their COLUMNS variants.

## RANGE Partitioning

The most common type, useful for time-series data:

```sql
CREATE TABLE orders (
  id BIGINT NOT NULL,
  customer_id INT NOT NULL,
  created_at DATE NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id, created_at)
)
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## LIST Partitioning

Partition by a specific set of discrete values:

```sql
CREATE TABLE sales (
  id INT NOT NULL,
  region VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id, region)
)
PARTITION BY LIST COLUMNS(region) (
  PARTITION p_americas VALUES IN ('US', 'CA', 'MX', 'BR'),
  PARTITION p_europe   VALUES IN ('UK', 'DE', 'FR', 'ES'),
  PARTITION p_asia     VALUES IN ('JP', 'CN', 'IN', 'SG')
);
```

## HASH Partitioning

Distribute rows evenly across a fixed number of partitions:

```sql
CREATE TABLE user_sessions (
  session_id VARCHAR(64) NOT NULL,
  user_id INT NOT NULL,
  data TEXT,
  PRIMARY KEY (session_id, user_id)
)
PARTITION BY HASH(user_id)
PARTITIONS 8;
```

## Partition Pruning

MySQL automatically skips irrelevant partitions when the WHERE clause matches the partitioning expression:

```sql
-- Only scans partition p2024 and p2025
SELECT * FROM orders
WHERE created_at BETWEEN '2024-01-01' AND '2025-12-31';

EXPLAIN SELECT * FROM orders
WHERE YEAR(created_at) = 2024;
-- Look for "partitions: p2024" in EXPLAIN output
```

## Managing Partitions

```sql
-- Add a new partition (must reorganize because p_future uses MAXVALUE)
ALTER TABLE orders REORGANIZE PARTITION p_future INTO (
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Drop an old partition (fast, no row-by-row DELETE)
ALTER TABLE orders DROP PARTITION p2023;

-- Check partition sizes
SELECT
  PARTITION_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1048576, 2) AS data_mb
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'orders';
```

## Partitioning Limitations

- Every `PRIMARY KEY` or `UNIQUE` index must include all columns used in the partitioning expression.
- Foreign keys are not supported on partitioned tables.
- Full-text indexes are not supported on partitioned tables.
- Partitioning is supported on InnoDB and MyISAM; not all storage engines support it.

## Summary

MySQL partitioning divides a table's data into physical segments that MySQL can query and manage independently. It improves performance on large tables through partition pruning and simplifies data archiving through partition drops. RANGE partitioning on date columns is the most common pattern, making it practical to expire old data by dropping a partition without locking the table for a full scan DELETE.

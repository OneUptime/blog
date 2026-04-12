# How to Use Partition Pruning in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partitioning, Partition Pruning, Query Optimization

Description: Learn how MySQL partition pruning works to skip irrelevant partitions during query execution, and how to write queries that take advantage of it.

---

## What Is Partition Pruning

Partition pruning is MySQL's ability to skip partitions that cannot contain rows matching a query's WHERE clause. Instead of scanning all partitions, MySQL reads only the relevant ones, dramatically reducing I/O for large partitioned tables.

Pruning happens automatically when the WHERE clause filters on the partitioning column.

## Example Table

```sql
CREATE TABLE orders (
  id         INT      NOT NULL AUTO_INCREMENT,
  created_at DATE     NOT NULL,
  amount     DECIMAL(10,2),
  status     VARCHAR(20),
  PRIMARY KEY (id, created_at)
)
PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2022 VALUES LESS THAN (2023),
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION pmax  VALUES LESS THAN MAXVALUE
);
```

## Verifying Partition Pruning with EXPLAIN

```sql
EXPLAIN SELECT * FROM orders WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';
```

```text
+----+-------------+--------+------------+------+...
| id | select_type | table  | partitions | type |...
+----+-------------+--------+------------+------+...
|  1 | SIMPLE      | orders | p2024      | ALL  |...
```

Only `p2024` is listed in the `partitions` column - MySQL pruned the other four partitions.

Without a filter on the partitioning column:

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'pending';
```

```text
partitions: p2022,p2023,p2024,p2025,pmax
```

All partitions are scanned because `status` is not the partitioning column.

## Queries That Enable Pruning

Pruning works when the WHERE clause uses:

```sql
-- Equality
WHERE YEAR(created_at) = 2024

-- Range
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'

-- BETWEEN
WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'

-- IN list (for LIST partitioning)
WHERE region IN ('USA', 'Canada')
```

## Queries That Prevent Pruning

```sql
-- Functions that differ from the partitioning expression break pruning
WHERE MONTH(created_at) = 3       -- Scans all partitions

-- OR conditions involving non-partitioned columns
WHERE created_at = '2024-06-01' OR status = 'new'  -- scans all
```

## Partition Pruning with Subpartitions

MySQL supports pruning on subpartitions too:

```sql
CREATE TABLE sales (
  id     INT  NOT NULL,
  year   INT  NOT NULL,
  region VARCHAR(20)
)
PARTITION BY RANGE (year)
SUBPARTITION BY KEY (region) SUBPARTITIONS 4 (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025)
);
```

A query filtering on both `year` and `region` prunes to the specific subpartition.

## Querying Specific Partitions Directly

You can also manually target a partition:

```sql
SELECT * FROM orders PARTITION (p2024) WHERE status = 'shipped';
```

This is useful for archive queries, partition-level backups, or debugging.

## Partition Pruning for DELETE and UPDATE

Pruning also applies to DML operations:

```sql
-- Deletes only rows in p2022, not full table scan
DELETE FROM orders WHERE created_at < '2023-01-01';

-- Even faster: drop the entire partition
ALTER TABLE orders DROP PARTITION p2022;
```

Dropping a partition is instantaneous compared to a filtered DELETE.

## Monitoring Partition Access

```sql
SELECT PARTITION_NAME, TABLE_ROWS
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME   = 'orders';
```

## Summary

Partition pruning automatically skips irrelevant partitions when the WHERE clause filters on the partitioning column. Verify pruning is active using `EXPLAIN` and checking the `partitions` column. Design queries to use equality or range conditions on the partition column, and avoid applying functions to it in WHERE clauses, to ensure pruning is applied.

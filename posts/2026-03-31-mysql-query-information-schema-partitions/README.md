# How to Query INFORMATION_SCHEMA.PARTITIONS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Partition, Partitioning, Schema Management

Description: Learn how to query INFORMATION_SCHEMA.PARTITIONS in MySQL to inspect partition definitions, row counts, storage sizes, and partition pruning eligibility.

---

## Overview

`INFORMATION_SCHEMA.PARTITIONS` provides detailed metadata about every table partition in MySQL, including non-partitioned tables (which appear as a single partition entry). For partitioned tables, it shows partition names, types, boundaries, row counts, and storage sizes.

## Basic Query

```sql
SELECT
  TABLE_NAME,
  PARTITION_NAME,
  SUBPARTITION_NAME,
  PARTITION_ORDINAL_POSITION,
  PARTITION_METHOD,
  PARTITION_EXPRESSION,
  PARTITION_DESCRIPTION,
  TABLE_ROWS,
  DATA_LENGTH,
  INDEX_LENGTH
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'myapp'
  AND PARTITION_NAME IS NOT NULL
ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION;
```

## Key Columns

| Column | Description |
|--------|-------------|
| `PARTITION_NAME` | Partition name (NULL for non-partitioned tables) |
| `PARTITION_ORDINAL_POSITION` | Partition number (1-based) |
| `PARTITION_METHOD` | RANGE, LIST, HASH, KEY, LINEAR HASH, LINEAR KEY, RANGE COLUMNS, LIST COLUMNS |
| `PARTITION_EXPRESSION` | Column or expression used for partitioning |
| `PARTITION_DESCRIPTION` | Boundary value for RANGE/LIST partitions |
| `TABLE_ROWS` | Estimated row count for this partition |
| `DATA_LENGTH` | Data size in bytes |
| `INDEX_LENGTH` | Index size in bytes |
| `CREATE_TIME` | Partition creation time |

## Finding All Partitioned Tables

```sql
SELECT DISTINCT TABLE_SCHEMA, TABLE_NAME, PARTITION_METHOD, PARTITION_EXPRESSION
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'myapp'
  AND PARTITION_NAME IS NOT NULL
ORDER BY TABLE_NAME;
```

## Checking Partition Row Distribution

Uneven row distribution can indicate partitioning key imbalance:

```sql
SELECT
  TABLE_NAME,
  PARTITION_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 1) AS data_mb
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'myapp'
  AND PARTITION_NAME IS NOT NULL
ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION;
```

## Finding the Oldest and Newest RANGE Partitions

```sql
SELECT
  TABLE_NAME,
  MIN(PARTITION_DESCRIPTION) AS oldest_partition,
  MAX(PARTITION_DESCRIPTION) AS newest_partition,
  COUNT(*) AS partition_count
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'myapp'
  AND PARTITION_METHOD = 'RANGE'
GROUP BY TABLE_NAME;
```

## Identifying Partition with the Most Data

```sql
SELECT
  TABLE_NAME,
  PARTITION_NAME,
  TABLE_ROWS,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'myapp'
  AND PARTITION_NAME IS NOT NULL
ORDER BY DATA_LENGTH DESC
LIMIT 10;
```

## Checking Total Size Per Table Across Partitions

```sql
SELECT
  TABLE_NAME,
  COUNT(*) AS partition_count,
  SUM(TABLE_ROWS) AS total_rows,
  ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS total_mb
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'myapp'
  AND PARTITION_NAME IS NOT NULL
GROUP BY TABLE_NAME
ORDER BY total_mb DESC;
```

## Generating ANALYZE PARTITION Statements

After large data loads, update partition statistics:

```sql
SELECT
  CONCAT('ALTER TABLE `', TABLE_SCHEMA, '`.`', TABLE_NAME,
    '` ANALYZE PARTITION `', PARTITION_NAME, '`;') AS analyze_stmt
FROM information_schema.PARTITIONS
WHERE TABLE_SCHEMA = 'myapp'
  AND PARTITION_NAME IS NOT NULL
ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION;
```

## Summary

`INFORMATION_SCHEMA.PARTITIONS` is the definitive source for MySQL partition metadata. By querying it, you can inspect partition boundaries, monitor row distribution balance, calculate per-partition storage sizes, and identify the oldest or largest partitions eligible for archival. This information is essential for managing range-partitioned time-series tables where regular partition rotation and pruning are critical for performance.

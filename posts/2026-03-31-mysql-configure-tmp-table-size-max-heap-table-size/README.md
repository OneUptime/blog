# How to Configure tmp_table_size and max_heap_table_size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Temporary Table, Memory, Performance

Description: Configure MySQL tmp_table_size and max_heap_table_size to control when temporary tables spill to disk, improving query performance for GROUP BY and ORDER BY.

---

## What These Variables Control

MySQL creates internal temporary tables to process complex queries involving `GROUP BY`, `ORDER BY`, `DISTINCT`, subqueries, and `UNION`. These tables start in memory for speed, but if they exceed the allowed size, they are converted to on-disk tables, which is much slower.

Two variables limit in-memory temporary table size:

- **`tmp_table_size`** - maximum size for internal memory temporary tables created by the optimizer
- **`max_heap_table_size`** - maximum size for `MEMORY` tables created explicitly by users

The effective limit for optimizer-created temporary tables is the **smaller** of the two values.

## Check Current Values

```sql
SHOW VARIABLES LIKE 'tmp_table_size';
SHOW VARIABLES LIKE 'max_heap_table_size';
```

```text
+----------------------+----------+
| Variable_name        | Value    |
+----------------------+----------+
| tmp_table_size       | 16777216 |
| max_heap_table_size  | 16777216 |
+----------------------+----------+
```

Default is 16 MB.

## Check How Often Temp Tables Spill to Disk

```sql
SHOW GLOBAL STATUS LIKE 'Created_tmp%';
```

```text
+-------------------------+--------+
| Variable_name           | Value  |
+-------------------------+--------+
| Created_tmp_disk_tables | 48320  |
| Created_tmp_tables      | 312450 |
+-------------------------+--------+
```

Calculate the on-disk percentage:

```sql
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_disk_tables') /
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Created_tmp_tables') * 100
  AS disk_pct;
```

If `disk_pct` is consistently above 10%, consider increasing the limits.

## Increase tmp_table_size and max_heap_table_size

Always set both values to the same amount:

```sql
SET GLOBAL tmp_table_size = 67108864;        -- 64 MB
SET GLOBAL max_heap_table_size = 67108864;   -- 64 MB
```

In `my.cnf`:

```ini
[mysqld]
tmp_table_size = 64M
max_heap_table_size = 64M
```

## Choosing the Right Value

The value is **per session** - if 100 connections each create a 64 MB temp table simultaneously, that is 6.4 GB of RAM. Set conservatively:

```sql
-- Calculate safe maximum based on available RAM
-- Formula: (available_ram * 0.10) / max_connections
-- Example: (8GB * 0.10) / 100 connections = 8 MB
```

For reporting/analytics workloads with fewer connections, you can set higher values:

```sql
-- For a dedicated analytics connection
SET SESSION tmp_table_size = 268435456;      -- 256 MB
SET SESSION max_heap_table_size = 268435456; -- 256 MB
```

## Identify Queries Creating Large Temp Tables

Use the Performance Schema to find queries using disk temp tables:

```sql
SELECT
  DIGEST_TEXT,
  SUM_CREATED_TMP_DISK_TABLES AS disk_tables,
  SUM_CREATED_TMP_TABLES AS total_tables,
  SUM_ROWS_EXAMINED AS rows_examined
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_CREATED_TMP_DISK_TABLES > 0
ORDER BY disk_tables DESC
LIMIT 10;
```

## Optimize Queries to Reduce Temp Table Size

Before raising the limit, try to optimize the query:

```sql
-- Original query creating a large temp table
SELECT category, COUNT(*), AVG(price)
FROM products
GROUP BY category;

-- Add an index on category to avoid sorting
ALTER TABLE products ADD INDEX idx_category (category);
```

## Summary

Set `tmp_table_size` and `max_heap_table_size` to equal values to control how large in-memory temporary tables can grow before spilling to disk. Monitor `Created_tmp_disk_tables` vs `Created_tmp_tables` to gauge whether the current limits are adequate. For most workloads, 64-128 MB is a good starting point, but scale based on concurrent connections and available RAM.

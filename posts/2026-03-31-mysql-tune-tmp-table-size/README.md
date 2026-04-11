# How to Tune tmp_table_size for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Tuning, Memory, Query

Description: Tune MySQL tmp_table_size and max_heap_table_size to keep temporary tables in memory and reduce disk I/O for GROUP BY, ORDER BY, and subquery operations.

---

MySQL creates internal temporary tables to process queries involving `GROUP BY`, `ORDER BY`, `DISTINCT`, `UNION`, derived tables, and subqueries. When these temporary tables exceed the `tmp_table_size` limit, MySQL spills them to disk as on-disk temporary tables, which is significantly slower.

## Understanding tmp_table_size and max_heap_table_size

Two variables control in-memory temporary table size:

- `tmp_table_size`: The maximum size of internal in-memory temporary tables
- `max_heap_table_size`: The maximum size of user-created MEMORY tables, which also caps in-memory temporary tables

The effective limit is the smaller of the two values. If you set `tmp_table_size = 64M` but `max_heap_table_size = 16M`, temporary tables are limited to 16 MB.

Check current values:

```sql
SHOW VARIABLES LIKE 'tmp_table_size';
SHOW VARIABLES LIKE 'max_heap_table_size';
```

## Checking How Often Disk Temporary Tables Are Created

Monitor temporary table usage with these status variables:

```sql
SHOW GLOBAL STATUS LIKE 'Created_tmp%';
```

```text
Created_tmp_disk_tables   1247
Created_tmp_files         38
Created_tmp_tables        18563
```

Calculate the ratio:

```sql
SELECT
  variable_value AS disk_tmp_tables
FROM performance_schema.global_status
WHERE variable_name = 'Created_tmp_disk_tables';

SELECT
  ROUND(
    (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Created_tmp_disk_tables') /
    (SELECT variable_value FROM performance_schema.global_status WHERE variable_name = 'Created_tmp_tables') * 100,
    2
  ) AS pct_disk_tmp_tables;
```

If more than 10-20% of temporary tables go to disk, consider increasing `tmp_table_size`.

## Setting tmp_table_size

For servers with 8-16 GB RAM, 64-256 MB per session is a common range. Since this is a per-session setting, be careful not to set it too high if you have many connections:

```sql
-- Set dynamically
SET GLOBAL tmp_table_size = 67108864;  -- 64MB
SET GLOBAL max_heap_table_size = 67108864;

-- Verify
SHOW VARIABLES LIKE 'tmp_table_size';
```

In `/etc/mysql/mysql.conf.d/mysqld.cnf` for persistence:

```text
[mysqld]
tmp_table_size = 64M
max_heap_table_size = 64M
```

## Identifying Queries Creating Large Temporary Tables

Use Performance Schema to find queries that create disk temporary tables:

```sql
SELECT
  DIGEST_TEXT,
  COUNT_STAR AS executions,
  SUM_CREATED_TMP_DISK_TABLES AS disk_tmp_tables,
  SUM_CREATED_TMP_TABLES AS tmp_tables,
  ROUND(SUM_CREATED_TMP_DISK_TABLES / SUM_CREATED_TMP_TABLES * 100, 1) AS pct_to_disk
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_CREATED_TMP_DISK_TABLES > 0
ORDER BY SUM_CREATED_TMP_DISK_TABLES DESC
LIMIT 10;
```

## When Increasing tmp_table_size Does Not Help

Some conditions force MySQL to use on-disk temporary tables regardless of `tmp_table_size`:

```sql
-- BLOB, TEXT, or JSON columns always go to disk
-- Check with EXPLAIN
EXPLAIN SELECT name, description FROM products GROUP BY category;
```

The `Extra` column will show `Using temporary` when MySQL needs a temporary table for the query. This alone does not indicate whether the table is in memory or on disk — use the `Created_tmp_disk_tables` status variable or Performance Schema to determine that. When BLOB or TEXT columns are involved, rewriting the query or adding an index is more effective than increasing the memory limit.

## Memory Impact Calculation

Calculate worst-case memory usage:

```text
max_memory_for_tmp_tables = max_connections * tmp_table_size
= 200 * 64MB = 12.8 GB
```

This is the theoretical maximum. In practice, not every connection creates a temporary table simultaneously, but it informs sizing decisions.

## Summary

Tune `tmp_table_size` and `max_heap_table_size` together to the same value to reduce disk temporary table creation. Monitor the `Created_tmp_disk_tables` to `Created_tmp_tables` ratio and aim for less than 10% of temporary tables going to disk. Use Performance Schema to identify specific queries that create frequent disk temporary tables, as rewriting those queries or adding indexes often produces a bigger improvement than simply increasing memory limits.

# How to Use InnoDB Temporary Tablespace in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Tablespace, Temporary Table, Performance

Description: Learn how MySQL's InnoDB temporary tablespace works, how to configure it, and how to monitor temporary table usage for performance tuning.

---

MySQL uses a dedicated temporary tablespace for on-disk temporary tables created by InnoDB. Since MySQL 5.7, InnoDB uses a separate `ibtmp1` file for temporary tables. This file can grow during server operation as queries create on-disk temporary tables, but it is removed and recreated at its initial size each time MySQL restarts.

## Understanding the Temporary Tablespace

The session temporary tablespace and the global temporary tablespace serve different purposes:

- **Global temporary tablespace (`ibtmp1`)**: Stores rollback segments for changes to user-created temporary tables
- **Session temporary tablespaces**: Each session that creates internal temporary tables gets its own file in the `#innodb_temp` directory (MySQL 8.0+)

```sql
-- Check global temporary tablespace configuration
SHOW VARIABLES LIKE 'innodb_temp_data_file_path';

-- Check session temporary tablespace directory
SHOW VARIABLES LIKE 'innodb_temp_tablespaces_dir';
```

## Configuring the Global Temporary Tablespace

Configure the size and auto-extension in `my.cnf`:

```text
[mysqld]
# 64MB initial, auto-extend up to 2GB max
innodb_temp_data_file_path=ibtmp1:64M:autoextend:max:2G
```

Without a `max` limit, the temporary tablespace can grow to fill the entire disk if a query generates massive intermediate results. Always set a maximum size in production.

## Session Temporary Tablespaces (MySQL 8.0)

MySQL 8.0 introduced per-session temporary tablespaces stored as `.ibt` files:

```sql
-- Monitor session temporary tablespace usage
SELECT * FROM information_schema.INNODB_SESSION_TEMP_TABLESPACES;
```

```text
+----+------------+------+------------+-------------+-----------+
| ID | SPACE      | PATH | SIZE       | STATE       | PURPOSE   |
+----+------------+------+------------+-------------+-----------+
| 47 | 4294566432 | ...  | 98304      | ACTIVE      | INTRINSIC |
+----+------------+------+------------+-------------+-----------+
```

## Monitoring Temporary Table Usage

```sql
-- Check how often queries spill to disk
SHOW GLOBAL STATUS LIKE 'Created_tmp%';
```

```text
+-------------------------+-------+
| Variable_name           | Value |
+-------------------------+-------+
| Created_tmp_disk_tables | 1523  |
| Created_tmp_files       | 12    |
| Created_tmp_tables      | 45892 |
+-------------------------+-------+
```

A high `Created_tmp_disk_tables` value indicates queries creating many on-disk temporary tables. This often points to queries involving large `GROUP BY`, `ORDER BY`, or `DISTINCT` operations on non-indexed columns.

## Tuning to Reduce Disk Temporary Tables

```sql
-- Increase in-memory limit to reduce disk spills
SET GLOBAL tmp_table_size = 128 * 1024 * 1024;      -- 128MB
SET GLOBAL max_heap_table_size = 128 * 1024 * 1024;  -- 128MB
```

In `my.cnf`:

```text
[mysqld]
tmp_table_size=128M
max_heap_table_size=128M
```

Note that these settings apply when the internal temporary table storage engine is MEMORY. In MySQL 8.0+, the default engine for internal temporary tables is TempTable, which is controlled by `temptable_max_ram` (default 1GB) instead. A MEMORY temporary table can use at most `MIN(tmp_table_size, max_heap_table_size)` before spilling to disk. With the MEMORY engine, BLOB and TEXT columns always force on-disk temporary tables. However, the TempTable engine (default in MySQL 8.0+) can store BLOB and TEXT columns in memory.

## Checking Current Temporary Tablespace Size

```bash
# Check ibtmp1 size on disk
ls -lh /var/lib/mysql/ibtmp1
```

```sql
-- Via information_schema (MySQL 8.0+)
SELECT NAME, ROUND(FILE_SIZE / 1024 / 1024, 2) AS size_mb
FROM information_schema.INNODB_TABLESPACES
WHERE NAME = 'innodb_temporary';
```

## Summary

MySQL's InnoDB temporary tablespace (`ibtmp1`) handles disk overflow for temporary tables and is recreated at its initial size on each restart. Always set an `innodb_temp_data_file_path` max size to prevent disk exhaustion. For MySQL 8.0+ with the default TempTable engine, tune `temptable_max_ram` to control in-memory limits. For the MEMORY engine, tune `tmp_table_size` and `max_heap_table_size`. Monitor `Created_tmp_disk_tables` to identify queries that need optimization.

# How to Handle MySQL Temporary File Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Temporary File, InnoDB, Performance, Configuration

Description: Learn how MySQL creates and manages temporary files for sorting, grouping, and large queries, and how to configure tmpdir and temp table settings to prevent disk exhaustion.

---

## How MySQL Uses Temporary Files

MySQL creates temporary files on disk in several situations:
- Sorting result sets larger than `sort_buffer_size`
- Creating internal temporary tables for GROUP BY, DISTINCT, and subqueries that exceed `tmp_table_size`
- Building indexes during ALTER TABLE operations
- Handling BLOB and TEXT data that overflows in-memory limits

These files are created in the directory specified by `tmpdir` and deleted when the operation completes. However, on a busy server handling large queries, temporary files can consume significant disk space simultaneously.

## Configuring the Temporary Directory

View the current `tmpdir`:

```sql
SHOW VARIABLES LIKE 'tmpdir';
```

Change it in `my.cnf` to a dedicated partition or high-speed storage:

```ini
[mysqld]
tmpdir = /var/tmp/mysql
```

On Linux, you can point `tmpdir` to a `tmpfs` mount for faster temporary I/O:

```bash
# Add to /etc/fstab
tmpfs /var/tmp/mysql tmpfs defaults,size=10G,noexec,nosuid 0 0

mount /var/tmp/mysql
chown mysql:mysql /var/tmp/mysql
```

Then set `tmpdir = /var/tmp/mysql` in `my.cnf`. Ensure the size is large enough for your worst-case queries.

## Controlling In-Memory Temp Tables

MySQL prefers in-memory temporary tables (TempTable or MEMORY engine) over disk-based ones. Configure their size:

```ini
[mysqld]
tmp_table_size = 256M
max_heap_table_size = 256M
temptable_max_ram = 1G
temptable_use_mmap = ON
temptable_max_mmap = 4G
```

`temptable_max_mmap` (MySQL 8.0.23+) allows the TempTable engine to use memory-mapped files as an intermediate before spilling to disk, reducing tmpdir usage.

Monitor how often temp tables spill to disk:

```sql
SHOW GLOBAL STATUS LIKE 'Created_tmp_disk_tables';
SHOW GLOBAL STATUS LIKE 'Created_tmp_tables';
```

Calculate the disk spill ratio:

```sql
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status
   WHERE VARIABLE_NAME = 'Created_tmp_disk_tables') /
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status
   WHERE VARIABLE_NAME = 'Created_tmp_tables') * 100 AS disk_spill_pct;
```

A ratio above 5% suggests `tmp_table_size` is too small for your workload.

## Finding Which Queries Generate Large Temp Files

Use Performance Schema to identify queries that create disk temp tables:

```sql
SELECT DIGEST_TEXT, COUNT_STAR,
       SUM_CREATED_TMP_DISK_TABLES,
       SUM_CREATED_TMP_TABLES
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_CREATED_TMP_DISK_TABLES > 0
ORDER BY SUM_CREATED_TMP_DISK_TABLES DESC
LIMIT 10;
```

Optimize these queries by adding appropriate indexes to avoid sorting or reducing result set size.

## Monitoring tmpdir Disk Usage

Monitor tmpdir space usage to catch large temporary file accumulation:

```bash
watch -n 5 'df -h /var/tmp/mysql && ls -lh /var/tmp/mysql/ 2>/dev/null | tail -20'
```

If tmpdir fills up, MySQL returns error 1004 (ER_CANT_CREATE_FILE) and the affected query fails.

## Handling Large Sort Operations

For queries that must sort large result sets, increase `sort_buffer_size` to keep more of the sort in memory:

```ini
[mysqld]
sort_buffer_size = 16M
```

This is a per-session allocation, so set it conservatively relative to `max_connections`. Alternatively, set it per-session for specific large queries:

```sql
SET SESSION sort_buffer_size = 64 * 1024 * 1024;
SELECT * FROM large_table ORDER BY complex_expression;
```

## Summary

MySQL temporary file management requires sizing `tmp_table_size`, `max_heap_table_size`, and `temptable_max_ram` to keep temp tables in memory, pointing `tmpdir` to a fast dedicated partition or tmpfs mount, and monitoring `Created_tmp_disk_tables` to detect queries spilling to disk. Query Performance Schema `events_statements_summary_by_digest` to find the specific queries driving temp file usage and optimize them with indexes or result set reduction.

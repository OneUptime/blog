# How to Configure table_open_cache in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Table Cache, File Descriptor, Performance

Description: Configure MySQL table_open_cache to reduce the overhead of repeatedly opening and closing table files, improving performance for databases with many tables.

---

## What Is table_open_cache

MySQL keeps table file descriptors open in a cache to avoid the overhead of reopening table files for every query. `table_open_cache` sets the maximum number of table instances that can be open simultaneously across all threads.

Each thread that queries a table needs its own entry in the cache. If the cache is full when a new table needs to be opened, MySQL closes the least recently used entry.

## Check the Current Value

```sql
SHOW VARIABLES LIKE 'table_open_cache';
```

```text
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| table_open_cache | 4000  |
+------------------+-------+
```

Default is 4000 in MySQL 8.0.

## Check Cache Efficiency

```sql
SHOW GLOBAL STATUS LIKE 'Open%';
```

```text
+--------------------------+-------+
| Variable_name            | Value |
+--------------------------+-------+
| Open_files               | 42    |
| Open_streams             | 0     |
| Open_table_definitions   | 512   |
| Open_tables              | 512   |
| Opened_files             | 1234  |
| Opened_table_definitions | 891   |
| Opened_tables            | 23456 |
+--------------------------+-------+
```

Compare `Open_tables` (currently open) vs `Opened_tables` (total opened since startup). If `Opened_tables` grows rapidly, the cache may be too small.

Check for table cache misses:

```sql
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Opened_tables') /
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Uptime') * 3600
  AS opens_per_hour;
```

A low `open_tables` relative to `table_open_cache` means the cache has room. If `open_tables` consistently equals `table_open_cache`, increase the cache.

## Increase table_open_cache

```sql
SET GLOBAL table_open_cache = 8000;
```

In `my.cnf`:

```ini
[mysqld]
table_open_cache = 8000
```

## Related Variable: table_open_cache_instances

MySQL can partition the table cache into multiple instances to reduce mutex contention on systems with many CPUs:

```sql
SHOW VARIABLES LIKE 'table_open_cache_instances';
```

```text
+----------------------------+-------+
| Variable_name              | Value |
+----------------------------+-------+
| table_open_cache_instances | 16    |
+----------------------------+-------+
```

Default is 16. The total cache is divided evenly, so each instance holds `table_open_cache` / `table_open_cache_instances` entries.

## Check Operating System File Descriptor Limits

The OS limits how many files a process can have open. MySQL needs file descriptors for tables, logs, and connections:

```bash
# Check current limit for the mysql process
cat /proc/$(pgrep mysqld)/limits | grep "open files"

# Or check system-wide
ulimit -n
```

Raise the OS limit if needed:

```bash
# /etc/security/limits.conf
mysql soft nofile 65536
mysql hard nofile 65536
```

Also set in `my.cnf`:

```ini
[mysqld]
open_files_limit = 65536
```

## How Much Memory Does table_open_cache Use

Each open table instance uses approximately 2 KB of memory. For 8000 entries: 8000 * 2 KB = 16 MB - negligible for most servers.

## table_open_cache vs table_definition_cache

There are two related caches:

- `table_open_cache` - file descriptor handles for open table instances
- `table_definition_cache` - table definitions from the data dictionary (metadata only)

```sql
SHOW VARIABLES LIKE 'table_definition_cache';
-- Default: 2000
SET GLOBAL table_definition_cache = 4000;
```

For databases with thousands of tables, increase both.

## Summary

Configure `table_open_cache` to reduce the overhead of repeatedly opening table file descriptors. Monitor `Opened_tables` growth rate and ensure `open_tables` does not consistently equal `table_open_cache`. For high-concurrency workloads, also tune `table_open_cache_instances` and ensure OS file descriptor limits (`open_files_limit`) are sufficient.

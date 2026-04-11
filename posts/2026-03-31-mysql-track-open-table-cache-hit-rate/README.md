# How to Track MySQL Open Table Cache Hit Rate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Cache, Monitoring

Description: Monitor the MySQL open table cache hit rate using global status variables, tune table_open_cache, and reduce file descriptor overhead.

---

Every table MySQL accesses requires opening the associated `.ibd` (InnoDB) file descriptor. The open table cache stores these open file handles and parsed table definitions so MySQL does not need to reopen them on every query. A low hit rate means constant file descriptor operations, which adds latency and OS overhead.

## Understanding the Table Cache

MySQL uses two relevant counters:

- `Opened_tables`: number of times a table had to be opened (cache miss or overflow)
- `Open_tables`: number of tables currently open in the cache

A rising `Opened_tables` rate relative to `Open_tables` indicates the cache is undersized.

## Reading the Counters

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN ('Opened_tables', 'Open_tables');
```

Check cache configuration:

```sql
SHOW VARIABLES LIKE 'table_open_cache%';
```

This shows `table_open_cache` (main cache size) and `table_open_cache_instances` (number of cache shards).

## Calculating the Open Miss Rate

There is no single "hit rate" counter, but you can derive a miss rate from the `Opened_tables` delta:

```bash
#!/bin/bash
T1=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Opened_tables'")
sleep 60
T2=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Opened_tables'")
echo "Tables reopened in last 60s: $((T2 - T1))"
```

If this number is consistently above 0, the cache is evicting entries before they are reused.

## Checking If Cache Is Full

```sql
-- If Open_tables equals table_open_cache, the cache is saturated
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status  WHERE VARIABLE_NAME = 'Open_tables')  AS open_now,
  (SELECT VARIABLE_VALUE FROM performance_schema.global_variables WHERE VARIABLE_NAME = 'table_open_cache') AS cache_size;
```

When `open_now` approaches `cache_size`, MySQL starts evicting entries.

## Tuning table_open_cache

```sql
-- Check current value
SHOW VARIABLES LIKE 'table_open_cache';

-- Increase dynamically
SET GLOBAL table_open_cache = 4000;
```

Or in `my.cnf`:

```text
[mysqld]
table_open_cache           = 4000
table_open_cache_instances = 16
```

More cache instances reduce mutex contention on multi-core servers. Set instances to a power of 2 up to the number of CPU cores.

## Check OS File Descriptor Limits

Increasing `table_open_cache` requires enough OS file descriptors:

```bash
# Check current limit
ulimit -n

# Check MySQL's open_files_limit
mysql -e "SHOW VARIABLES LIKE 'open_files_limit';"
```

Set `open_files_limit` in `my.cnf` to at least `table_open_cache * 2 + max_connections + 10`:

```text
[mysqld]
open_files_limit = 65535
```

## Summary

Monitor `Opened_tables` rate to detect table cache misses. When the rate is non-zero and rising, increase `table_open_cache` and `table_open_cache_instances`. Ensure the OS `ulimit -n` and MySQL `open_files_limit` are large enough to accommodate the expanded cache.

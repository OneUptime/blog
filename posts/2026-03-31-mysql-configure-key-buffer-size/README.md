# How to Configure key_buffer_size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, MyISAM, Key Buffer, Performance

Description: Configure MySQL key_buffer_size to optimize MyISAM index block caching, monitor cache hit rates, and right-size memory allocation for your workload.

---

## What Is key_buffer_size

`key_buffer_size` is the size of the buffer used to cache MyISAM table index blocks. It is one of the most important tuning parameters for MyISAM-heavy workloads. When MyISAM reads an index block from disk, the block is placed in the key buffer for reuse by subsequent queries.

For InnoDB tables, the equivalent is `innodb_buffer_pool_size`, which caches both data and indexes. `key_buffer_size` does **not** affect InnoDB.

## Check the Current Value

```sql
SHOW VARIABLES LIKE 'key_buffer_size';
```

```text
+-----------------+---------+
| Variable_name   | Value   |
+-----------------+---------+
| key_buffer_size | 8388608 |
+-----------------+---------+
```

Default is 8 MB.

## Check Key Buffer Hit Rate

```sql
SHOW GLOBAL STATUS LIKE 'Key%';
```

```text
+------------------------+---------+
| Variable_name          | Value   |
+------------------------+---------+
| Key_blocks_not_flushed | 0       |
| Key_blocks_unused      | 12453   |
| Key_blocks_used        | 8897    |
| Key_read_requests      | 4523890 |
| Key_reads              | 23456   |
| Key_write_requests     | 893400  |
| Key_writes             | 12345   |
+------------------------+---------+
```

Calculate the key cache hit rate:

```sql
SELECT
  ROUND(
    (1 - (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Key_reads') /
         (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Key_read_requests')
    ) * 100, 2
  ) AS key_cache_hit_pct;
```

A hit rate above 99% is the target. Below 95% indicates the key buffer is too small.

## Check Buffer Utilization

```sql
SELECT
  (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Key_blocks_used') /
  (
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Key_blocks_used') +
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Key_blocks_unused')
  ) * 100 AS buffer_usage_pct;
```

If `buffer_usage_pct` is near 100%, the buffer is full and index blocks are being evicted.

## Increase key_buffer_size

```sql
SET GLOBAL key_buffer_size = 134217728;  -- 128 MB
```

In `my.cnf`:

```ini
[mysqld]
key_buffer_size = 128M
```

## Estimate Required Size

The key buffer should ideally hold all MyISAM index data:

```sql
-- Calculate total MyISAM index size
SELECT
  SUM(index_length) / 1024 / 1024 AS myisam_index_mb
FROM information_schema.tables
WHERE engine = 'MyISAM'
  AND table_schema NOT IN ('mysql', 'sys', 'information_schema', 'performance_schema');
```

Set `key_buffer_size` to match this value (or as large as available RAM allows).

## If You Use Only InnoDB

If you have migrated all tables to InnoDB, a small `key_buffer_size` is still recommended because MySQL may create temporary MyISAM tables during query processing:

```sql
-- A small key_buffer_size of 32M is sufficient for InnoDB-only workloads
```

```ini
[mysqld]
key_buffer_size = 32M
```

## Multiple Key Caches

MySQL supports named key caches for different tables:

```sql
-- Create a named key cache
SET GLOBAL hot_cache.key_buffer_size = 32 * 1024 * 1024;

-- Assign an index to the named cache
CACHE INDEX orders IN hot_cache;
LOAD INDEX INTO CACHE orders;
```

## Summary

`key_buffer_size` caches MyISAM index blocks. Monitor the cache hit rate (1 - `Key_reads` / `Key_read_requests`) - target above 99%. Size the buffer to match total MyISAM index size when possible. For InnoDB-only servers, 32 MB is sufficient for system tables. Use `innodb_buffer_pool_size` for InnoDB performance tuning instead.

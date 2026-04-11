# How to Troubleshoot MySQL Memory Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Memory, InnoDB, Performance Schema, Troubleshooting

Description: Learn how to diagnose and resolve MySQL memory issues including OOM kills, excessive buffer pool usage, and memory leaks using Performance Schema.

---

## Identifying the Problem

MySQL memory issues often manifest as OOM (out of memory) kills, swap usage, or a sluggish server. Start by checking overall memory usage:

```bash
free -h
# Check if swap is being used heavily

ps aux --sort=-%mem | head -5
# Find memory-hungry processes
```

Check MySQL's own memory consumption:

```bash
cat /proc/$(pidof mysqld)/status | grep -i vmrss
```

## Checking InnoDB Buffer Pool

The buffer pool is typically the largest consumer of MySQL memory. Check its current size and usage:

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW STATUS LIKE 'Innodb_buffer_pool_%';
```

Key metrics:

```sql
SELECT
  FORMAT(@@innodb_buffer_pool_size / 1024 / 1024 / 1024, 2) AS buffer_pool_gb,
  (SELECT FORMAT(VARIABLE_VALUE / 1024 / 1024, 2)
     FROM performance_schema.global_status
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_bytes_data') AS data_mb,
  (SELECT FORMAT(VARIABLE_VALUE / 1024 / 1024, 2)
     FROM performance_schema.global_status
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_bytes_dirty') AS dirty_mb,
  (SELECT ROUND(
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status
      WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_data') /
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status
      WHERE VARIABLE_NAME = 'Innodb_buffer_pool_pages_total') * 100, 1
  )) AS fill_pct;
```

A simpler approach:

```sql
SELECT
  VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Innodb_buffer_pool_pages_total',
  'Innodb_buffer_pool_pages_free',
  'Innodb_buffer_pool_bytes_data'
);
```

## Using Performance Schema to Find Memory Consumers

```sql
SELECT
  EVENT_NAME,
  CURRENT_ALLOC,
  HIGH_ALLOC
FROM sys.memory_global_by_current_bytes
LIMIT 20;
```

This shows the top memory consumers by component. Common large consumers include `memory/innodb/buf_buf_pool`, `memory/performance_schema`, and `memory/sql/THD`.

## Per-Connection Memory

Each connection allocates buffers for sorting, joins, and temp tables. High connection counts can exhaust memory:

```sql
SHOW STATUS LIKE 'Threads_connected';
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'sort_buffer_size';
SHOW VARIABLES LIKE 'join_buffer_size';
SHOW VARIABLES LIKE 'read_buffer_size';
```

These per-thread buffers multiply by the number of simultaneous queries. Reducing them can free significant memory under high concurrency:

```sql
SET GLOBAL sort_buffer_size  = 256 * 1024;  -- 256 KB
SET GLOBAL join_buffer_size  = 256 * 1024;
SET GLOBAL read_buffer_size  = 128 * 1024;
```

## Detecting Memory Leaks

If memory grows indefinitely, check for long-running queries or unclosed connections:

```sql
SELECT id, user, host, time, info
FROM information_schema.PROCESSLIST
WHERE time > 300
ORDER BY time DESC;
```

Also check whether `performance_schema` itself is consuming too much memory and consider disabling expensive instruments:

```sql
UPDATE performance_schema.setup_instruments
SET ENABLED = 'NO', TIMED = 'NO'
WHERE NAME LIKE 'memory/%'
  AND NAME NOT LIKE 'memory/innodb/%';
```

## Right-Sizing the Buffer Pool

A general rule is to allocate 50-75% of available RAM to the buffer pool on a dedicated MySQL server:

```bash
# In /etc/mysql/mysql.conf.d/mysqld.cnf
innodb_buffer_pool_size = 4G
```

Restart MySQL after changing this value, or use `SET GLOBAL innodb_buffer_pool_size = 4294967296` on MySQL 5.7.5+ without a restart.

## Summary

MySQL memory issues usually stem from an oversized buffer pool, excessive per-thread buffer settings, too many connections, or memory leaks from long-running queries. Use `sys.memory_global_by_current_bytes` to find top consumers, review per-thread buffer variables, and monitor the `PROCESSLIST` for long-running queries. Right-size the buffer pool to 50-75% of RAM and reduce sort/join buffers if connection counts are high.

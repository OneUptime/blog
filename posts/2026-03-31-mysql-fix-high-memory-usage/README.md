# How to Fix High Memory Usage in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Memory, Performance, InnoDB, Configuration

Description: Fix high MySQL memory usage by right-sizing the InnoDB buffer pool, reducing per-thread buffers, and auditing performance_schema memory consumption.

---

MySQL can consume large amounts of RAM, causing the OOM killer to terminate the process or starving other applications. Memory usage comes from the InnoDB buffer pool, per-connection buffers, the performance schema, and query processing. This guide shows how to measure and reduce memory consumption.

## Measure Current Memory Usage

```bash
# Check MySQL process memory
ps aux | grep mysqld
# Or
cat /proc/$(pidof mysqld)/status | grep -i vmrss

# Check OOM killer history
dmesg | grep -i "oom\|killed"
```

```sql
-- Check memory allocation in performance_schema
SELECT EVENT_NAME, CURRENT_NUMBER_OF_BYTES_USED/1024/1024 AS MB
FROM performance_schema.memory_summary_global_by_event_name
ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 20;
```

## The InnoDB Buffer Pool

The buffer pool is typically the largest consumer. A common rule is to set it to 70-80% of available RAM on a dedicated MySQL server:

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- Check actual usage
SELECT FORMAT(pool_size*16/1024, 0) AS pool_MB,
       FORMAT(database_pages*16/1024, 0) AS used_MB,
       FORMAT(free_buffers*16/1024, 0) AS free_MB
FROM information_schema.INNODB_BUFFER_POOL_STATS;
```

If the server is shared with other processes, reduce the buffer pool:

```text
[mysqld]
innodb_buffer_pool_size = 1G
```

For large systems, use multiple buffer pool instances:

```text
[mysqld]
innodb_buffer_pool_size = 8G
innodb_buffer_pool_instances = 8
```

## Reduce Per-Thread Memory Buffers

Each connection allocates private buffers. With many connections, these add up:

```sql
SHOW VARIABLES LIKE 'read_buffer_size';
SHOW VARIABLES LIKE 'read_rnd_buffer_size';
SHOW VARIABLES LIKE 'sort_buffer_size';
SHOW VARIABLES LIKE 'join_buffer_size';
SHOW VARIABLES LIKE 'tmp_table_size';
SHOW VARIABLES LIKE 'max_heap_table_size';
```

Reduce defaults for high-connection environments:

```text
[mysqld]
read_buffer_size = 256K
read_rnd_buffer_size = 512K
sort_buffer_size = 1M
join_buffer_size = 256K
tmp_table_size = 32M
max_heap_table_size = 32M
```

## Disable or Tune performance_schema

Performance schema uses significant memory:

```sql
SHOW VARIABLES LIKE 'performance_schema';

-- Check memory used by performance_schema instruments
SELECT SUM(CURRENT_NUMBER_OF_BYTES_USED)/1024/1024 AS total_MB
FROM performance_schema.memory_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'memory/performance_schema/%';
```

To reduce its footprint, disable unused consumers in `my.cnf`:

```text
[mysqld]
performance_schema_max_table_instances = 500
performance_schema_max_sql_text_length = 1024
```

## Control Connection Count

Unused idle connections still hold allocated per-thread memory:

```sql
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
```

```text
[mysqld]
max_connections = 100
wait_timeout = 300
interactive_timeout = 300
```

## Summary

MySQL high memory usage is controlled primarily through `innodb_buffer_pool_size`, which should be right-sized based on your dataset and available RAM. Secondary savings come from reducing per-thread buffer sizes and controlling the maximum connection count. Use `performance_schema.memory_summary_global_by_event_name` to audit exactly where memory is being allocated before reducing specific settings.

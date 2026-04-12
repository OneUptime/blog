# How to Reduce MySQL Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Memory, Performance Tuning, Configuration, Database

Description: Learn practical strategies to reduce MySQL memory consumption - from tuning the buffer pool to shrinking per-thread buffers and disabling unused features.

---

## Understanding MySQL Memory Consumption

MySQL memory usage comes from several pools:

1. **InnoDB buffer pool** - usually the largest consumer
2. **Per-thread buffers** - allocated per connection (sort buffer, join buffer, read buffer)
3. **InnoDB redo log buffer** - in-memory buffer before disk flush
4. **Table open cache** - metadata for open tables
5. **Performance schema** - instrumentation memory

```sql
-- Get a summary of memory usage
SELECT * FROM sys.memory_global_by_current_bytes LIMIT 10;
```

## Check Current Memory Usage

```sql
-- InnoDB buffer pool
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- Total allocated memory (approximate)
SELECT
  ROUND(SUM(current_alloc) / 1024 / 1024, 2) AS total_alloc_mb
FROM sys.x$memory_global_by_current_bytes;
```

```bash
# OS-level view
ps aux | grep mysqld | awk '{print $6/1024 " MB"}'
```

## Right-Size the InnoDB Buffer Pool

The buffer pool is typically 70-80% of available RAM. On a server with other processes or limited RAM, reduce it:

```text
[mysqld]
# For a 4 GB server with other processes
innodb_buffer_pool_size = 2G
```

For minimal environments (development, small VMs):

```text
[mysqld]
innodb_buffer_pool_size = 256M
```

## Reduce Per-Thread Buffers

These buffers are allocated per connection on demand. On servers with many connections, the defaults can add up significantly:

```text
[mysqld]
# Reduce per-thread buffers
sort_buffer_size = 256K         # Default 256K, some distros set 2M+
read_buffer_size = 128K         # Default 128K
read_rnd_buffer_size = 256K     # Default 256K
join_buffer_size = 256K         # Default 256K
thread_stack = 1M               # Default 1M, rarely needs changing
binlog_cache_size = 32K         # Default 32K, increase only for large transactions
```

Check if these are being set too high on your system:

```sql
SHOW VARIABLES LIKE 'sort_buffer_size';
SHOW VARIABLES LIKE 'join_buffer_size';
```

## Reduce the Table Open Cache

The table open cache holds file handles for open tables. On systems with thousands of tables, this can be large:

```sql
SHOW STATUS LIKE 'Open_tables';
SHOW STATUS LIKE 'Opened_tables';
SHOW VARIABLES LIKE 'table_open_cache';
```

Set it to 1.5x your typical `Open_tables` count:

```text
[mysqld]
table_open_cache = 400
table_definition_cache = 400
```

## Disable Performance Schema on Low-Memory Systems

Performance Schema consumes significant memory (hundreds of MB) for instrumentation:

```text
[mysqld]
performance_schema = OFF
```

Or reduce its footprint with selective configuration:

```sql
-- Disable expensive consumers
UPDATE performance_schema.setup_consumers
SET enabled = 'NO'
WHERE name LIKE '%statements%history_long%';

-- Check current memory usage
SELECT * FROM sys.memory_global_by_current_bytes
LIMIT 10;
```

## Reduce InnoDB Redo Log Buffer

For low-write workloads, the default 16 MB log buffer is sufficient:

```text
[mysqld]
innodb_log_buffer_size = 16M   # Reduce from larger values
```

## Limit the Number of Connections

Each connection allocates stack and buffer memory. Reducing `max_connections` and using a connection pool reduces memory overhead:

```text
[mysqld]
max_connections = 100   # Lower value when using connection pooling
```

## Monitor Memory Over Time

```sql
-- Top memory consumers
SELECT
  event_name,
  current_alloc,
  high_alloc
FROM sys.x$memory_global_by_current_bytes
ORDER BY current_alloc DESC
LIMIT 20;
```

```bash
# Watch mysqld RSS over time
watch -n 5 "ps -o pid,rss,vsz,comm -p $(pgrep mysqld)"
```

## Summary

Reducing MySQL memory usage requires right-sizing the InnoDB buffer pool, trimming per-thread buffers, reducing the table open cache, and optionally disabling Performance Schema on memory-constrained systems. Using connection pooling to limit active connections is the most effective way to control per-thread buffer overhead at scale.

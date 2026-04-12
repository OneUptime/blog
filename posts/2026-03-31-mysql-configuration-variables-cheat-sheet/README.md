# MySQL Configuration Variables Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Variable, Cheat Sheet

Description: Quick reference for the most important MySQL configuration variables covering InnoDB, connections, replication, logging, and query tuning with recommended starting values.

---

## Viewing and Setting Variables

```sql
-- View a variable
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- View all variables matching a pattern
SHOW VARIABLES LIKE 'innodb_%';

-- Set a session variable
SET SESSION sort_buffer_size = 8388608;

-- Set a global variable (no restart needed for dynamic vars)
SET GLOBAL max_connections = 500;

-- Check where a variable's current value was set from
SELECT variable_name, variable_source, variable_path
FROM performance_schema.variables_info
WHERE variable_name = 'max_connections';
```

## InnoDB Buffer Pool

```text
innodb_buffer_pool_size      - main cache; set to 70-80% of RAM
innodb_buffer_pool_instances - split pool into N instances (reduce contention)
innodb_buffer_pool_chunk_size- chunk size for dynamic resizing
```

```text
[mysqld]
innodb_buffer_pool_size      = 8G
innodb_buffer_pool_instances = 8
```

## InnoDB I/O and Flushing

```text
innodb_io_capacity           - I/O ops per second hint (SSD: 2000-10000)
innodb_io_capacity_max       - burst cap
innodb_flush_log_at_trx_commit - 1=durable, 2=~1s risk, 0=best perf
innodb_flush_method          - O_DIRECT recommended on Linux
innodb_log_file_size         - redo log size (256M-2G typical)
innodb_doublewrite           - ON for data safety
```

```text
innodb_flush_log_at_trx_commit = 1
innodb_flush_method            = O_DIRECT
innodb_io_capacity             = 2000
innodb_log_file_size           = 512M
```

## Connections and Threads

```text
max_connections       - max simultaneous connections
thread_cache_size     - cached idle threads
wait_timeout          - idle non-interactive timeout (seconds)
interactive_timeout   - idle interactive timeout
connect_timeout       - seconds to wait during handshake
back_log              - pending connection queue depth
```

```text
max_connections   = 300
thread_cache_size = 50
wait_timeout      = 300
interactive_timeout = 300
```

## Query Cache (Removed in 8.0)

```text
query_cache_type = 0   (disabled, deprecated in 5.7, removed in 8.0)
```

## Query Execution

```text
sort_buffer_size        - per-connection sort buffer
join_buffer_size        - per-join buffer (no index joins)
tmp_table_size          - max in-memory temp table size
max_heap_table_size     - also limits in-memory temp tables
read_buffer_size        - sequential scan buffer
read_rnd_buffer_size    - random read buffer (post-sort)
```

```text
sort_buffer_size     = 4M
join_buffer_size     = 4M
tmp_table_size       = 64M
max_heap_table_size  = 64M
```

## Logging

```text
slow_query_log           = ON
slow_query_log_file      = /var/log/mysql/slow.log
long_query_time          = 1       (seconds)
log_queries_not_using_indexes = ON
log_bin                  = mysql-bin
binlog_format            = ROW
binlog_expire_logs_seconds = 604800 (7 days)
```

## Replication

```text
server_id                = 1    (unique per server)
gtid_mode                = ON
enforce_gtid_consistency = ON
replica_parallel_workers = 4    (parallel apply threads)
```

## Character Set

```text
character_set_server = utf8mb4
collation_server     = utf8mb4_unicode_ci
```

## Summary

MySQL's configuration variables control nearly every performance and behavior characteristic. The most impactful variables are `innodb_buffer_pool_size` (allocate most available RAM), `innodb_flush_log_at_trx_commit` (durability vs. speed trade-off), `max_connections` (concurrency ceiling), and `slow_query_log` (visibility into bad queries). After changing global variables, use SHOW VARIABLES to confirm the change took effect, and update `my.cnf` to persist across restarts.

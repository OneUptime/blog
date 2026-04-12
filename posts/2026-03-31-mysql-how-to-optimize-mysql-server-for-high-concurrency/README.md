# How to Optimize MySQL Server for High Concurrency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Tuning, High Concurrency, InnoDB

Description: Learn the key MySQL configuration settings and techniques to optimize your server for high-concurrency workloads with many simultaneous connections.

---

## Understanding High-Concurrency Bottlenecks

Under high concurrency, MySQL can be bottlenecked by:

- Connection overhead (creating/destroying connections)
- InnoDB lock contention
- Buffer pool contention
- Thread scheduling
- I/O saturation

The goal is to reduce lock contention, improve memory efficiency, and tune thread handling.

## Step 1 - Tune InnoDB Buffer Pool

The buffer pool caches data pages and indexes. It should use 60-80% of available RAM:

```ini
[mysqld]
innodb_buffer_pool_size = 12G          # For a 16GB RAM server
innodb_buffer_pool_instances = 8       # Each instance should be at least 1GB (max 64)
innodb_buffer_pool_chunk_size = 128M
```

Multiple instances reduce mutex contention at high concurrency.

## Step 2 - Optimize InnoDB I/O

```ini
[mysqld]
innodb_io_capacity     = 2000          # IOPS available (SSD: 2000-10000)
innodb_io_capacity_max = 4000
innodb_flush_method    = O_DIRECT
innodb_read_io_threads  = 8
innodb_write_io_threads = 8
innodb_flush_log_at_trx_commit = 1     # 1 for full ACID, 2 for better throughput
```

## Step 3 - Thread Handling

MySQL can use a thread pool to handle many connections with fewer OS threads:

```ini
[mysqld]
thread_handling = pool-of-threads   # Requires MySQL Enterprise or Percona Server
thread_pool_size = 32               # Typically equal to CPU count
```

For standard MySQL, tune the thread cache:

```ini
[mysqld]
thread_cache_size = 100
```

Check thread cache effectiveness:

```sql
SHOW STATUS LIKE 'Threads_created';
SHOW STATUS LIKE 'Connections';
```

If `Threads_created / Connections` is high, increase `thread_cache_size`.

## Step 4 - Reduce Lock Contention

Enable InnoDB row-level locking (default in InnoDB but confirm):

```sql
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';
```

Set a reasonable timeout to avoid long waits:

```ini
[mysqld]
innodb_lock_wait_timeout = 10
```

Monitor current locks:

```sql
SELECT * FROM performance_schema.data_locks\G
```

## Step 5 - Optimize Connection Limits

```ini
[mysqld]
max_connections          = 500
back_log                 = 150    # TCP listen queue for pending connection requests
max_connect_errors       = 1000000
wait_timeout             = 300    # Close idle connections after 5 minutes
interactive_timeout      = 300
```

Reclaim idle connections faster:

```sql
SHOW PROCESSLIST;
-- Kill idle connections
KILL CONNECTION <id>;
```

## Step 6 - Sort and Join Buffers

```ini
[mysqld]
sort_buffer_size  = 4M    # Per connection - keep low
join_buffer_size  = 4M    # Per connection - keep low
read_buffer_size  = 2M
read_rnd_buffer_size = 4M
```

Keep per-connection buffers small to avoid excessive memory use with many connections.

## Step 7 - Enable the Performance Schema Selectively

Full Performance Schema has overhead. Enable only what you need:

```ini
[mysqld]
performance_schema                    = ON
performance_schema_instrument         = 'statement/%=ON'
performance_schema_consumer_events_statements_history = ON
```

## Monitoring Concurrency Metrics

```sql
-- Active connections
SHOW STATUS LIKE 'Threads_running';

-- Wait events
SELECT EVENT_NAME, SUM_TIMER_WAIT/1e12 AS wait_seconds
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE SUM_TIMER_WAIT > 0
ORDER BY wait_seconds DESC
LIMIT 10;
```

## Summary

For high-concurrency MySQL, focus on: sizing the InnoDB buffer pool to 60-80% of RAM with multiple instances, tuning `innodb_io_capacity` for your storage, reducing per-connection buffer sizes, and setting appropriate connection limits with short `wait_timeout` values. Monitor `Threads_running` and lock waits in Performance Schema to identify remaining bottlenecks.

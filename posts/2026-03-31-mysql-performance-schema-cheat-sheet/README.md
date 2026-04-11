# MySQL Performance Schema Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Monitoring, Cheat Sheet

Description: Quick reference for MySQL Performance Schema tables and queries to diagnose slow queries, lock contention, memory usage, I/O bottlenecks, and thread activity.

---

## Enabling Performance Schema

```sql
-- Check if enabled
SHOW VARIABLES LIKE 'performance_schema';

-- Enable in my.cnf (requires restart)
-- [mysqld]
-- performance_schema = ON
```

## Slow Query Analysis

```sql
-- Top 10 slowest queries by total execution time
SELECT digest_text,
       count_star          AS exec_count,
       ROUND(avg_timer_wait / 1e9, 2) AS avg_ms,
       ROUND(sum_timer_wait / 1e9, 2) AS total_ms
FROM performance_schema.events_statements_summary_by_digest
ORDER BY sum_timer_wait DESC
LIMIT 10;
```

## Currently Running Queries

```sql
SELECT thread_id, sql_text, timer_wait / 1e12 AS elapsed_sec
FROM performance_schema.events_statements_current
WHERE sql_text IS NOT NULL
ORDER BY timer_wait DESC;
```

## Lock Contention

```sql
-- Current lock waits
SELECT w.requesting_thread_id,
       w.blocking_thread_id,
       l.object_name,
       l.lock_type,
       l.lock_status
FROM performance_schema.data_lock_waits w
JOIN performance_schema.data_locks l
  ON w.blocking_engine_lock_id = l.engine_lock_id;

-- Metadata lock waits
SELECT * FROM performance_schema.metadata_locks
WHERE lock_status = 'PENDING';
```

## Table I/O Stats

```sql
SELECT object_schema,
       object_name,
       count_read,
       count_write,
       ROUND(sum_timer_read / 1e9, 2) AS read_ms,
       ROUND(sum_timer_write / 1e9, 2) AS write_ms
FROM performance_schema.table_io_waits_summary_by_table
ORDER BY sum_timer_wait DESC
LIMIT 20;
```

## File I/O Stats

```sql
SELECT file_name,
       count_read + count_write AS total_ops,
       ROUND(sum_timer_wait / 1e9, 2) AS total_ms
FROM performance_schema.file_summary_by_instance
ORDER BY sum_timer_wait DESC
LIMIT 10;
```

## Memory Usage

```sql
SELECT event_name,
       CURRENT_NUMBER_OF_BYTES_USED AS current_bytes,
       HIGH_NUMBER_OF_BYTES_USED AS high_bytes
FROM performance_schema.memory_summary_global_by_event_name
WHERE CURRENT_NUMBER_OF_BYTES_USED > 0
ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 20;
```

## Connection Statistics per User/Host

```sql
-- Per user
SELECT user, count_star, sum_errors,
       ROUND(avg_timer_wait / 1e9, 2) AS avg_ms
FROM performance_schema.events_statements_summary_by_user_by_event_name
WHERE event_name = 'statement/sql/select'
ORDER BY sum_timer_wait DESC;

-- Per host
SELECT host, current_connections, total_connections
FROM performance_schema.hosts
WHERE host IS NOT NULL;
```

## Thread Monitoring

```sql
SELECT thread_id, name, type,
       processlist_user, processlist_host,
       processlist_command, processlist_state
FROM performance_schema.threads
WHERE type = 'FOREGROUND'
ORDER BY thread_id;
```

## Wait Events (what MySQL is waiting on)

```sql
SELECT event_name,
       count_star,
       ROUND(avg_timer_wait / 1e9, 4) AS avg_ms
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE count_star > 0
ORDER BY sum_timer_wait DESC
LIMIT 20;
```

## Enabling/Disabling Instruments

```sql
-- Enable a specific instrument
UPDATE performance_schema.setup_instruments
SET enabled = 'YES', timed = 'YES'
WHERE name LIKE 'statement/%';

-- Enable all consumers
UPDATE performance_schema.setup_consumers
SET enabled = 'YES'
WHERE name LIKE 'events_statements%';
```

## Summary

MySQL Performance Schema provides instrumentation data for queries, locks, I/O, memory, and threads without requiring external agents. Key tables include events_statements_summary_by_digest for slow query analysis, data_lock_waits for deadlock investigation, and table_io_waits_summary_by_table for finding hot tables. Pair Performance Schema with the sys schema for pre-built diagnostic views.

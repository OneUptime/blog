# How to Monitor Memory Usage with Performance Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Memory, Monitoring, Diagnostic

Description: Learn how to use MySQL Performance Schema memory instrumentation to track memory allocation by component, thread, and event for diagnosing memory issues.

---

The MySQL Performance Schema provides detailed memory instrumentation that lets you see exactly how much memory each internal component, thread, and event is using. This is invaluable for diagnosing memory leaks, understanding the impact of configuration changes, and planning server capacity.

## Enabling Memory Instrumentation

Memory instruments are enabled by default in MySQL 8.0 when `performance_schema = ON`. Verify:

```sql
SELECT ENABLED
FROM performance_schema.setup_instruments
WHERE NAME = 'memory/sql/THD::main_mem_root'
LIMIT 1;
```

Enable all memory instruments if any are disabled:

```sql
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES'
WHERE NAME LIKE 'memory/%';
```

## Memory Summary by Event (Global View)

The most comprehensive view - memory allocated by each internal event type:

```sql
SELECT
  EVENT_NAME,
  CURRENT_COUNT_USED,
  ROUND(CURRENT_NUMBER_OF_BYTES_USED / 1024 / 1024, 2) AS current_mb,
  ROUND(HIGH_NUMBER_OF_BYTES_USED / 1024 / 1024, 2) AS peak_mb
FROM performance_schema.memory_summary_global_by_event_name
WHERE CURRENT_NUMBER_OF_BYTES_USED > 0
ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 20;
```

## Breakdown by Subsystem

Group memory usage by subsystem (InnoDB, SQL engine, Performance Schema itself):

```sql
SELECT
  SUBSTRING_INDEX(EVENT_NAME, '/', 2) AS subsystem,
  ROUND(SUM(CURRENT_NUMBER_OF_BYTES_USED) / 1024 / 1024, 2) AS current_mb,
  ROUND(SUM(HIGH_NUMBER_OF_BYTES_USED) / 1024 / 1024, 2) AS peak_mb
FROM performance_schema.memory_summary_global_by_event_name
GROUP BY subsystem
ORDER BY current_mb DESC;
```

This shows how much memory InnoDB, the SQL layer, the Performance Schema itself, and other components consume.

## Memory Usage Per Thread

Identify which threads are consuming the most memory:

```sql
SELECT
  t.PROCESSLIST_ID,
  t.PROCESSLIST_USER,
  t.PROCESSLIST_DB,
  t.PROCESSLIST_COMMAND,
  ROUND(m.CURRENT_NUMBER_OF_BYTES_USED / 1024, 2) AS current_kb
FROM performance_schema.memory_summary_by_thread_by_event_name m
JOIN performance_schema.threads t ON m.THREAD_ID = t.THREAD_ID
WHERE m.EVENT_NAME = 'memory/sql/THD::main_mem_root'
  AND m.CURRENT_NUMBER_OF_BYTES_USED > 0
ORDER BY m.CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 10;
```

## Memory Usage Per User Account

Aggregate memory consumption by database user:

```sql
SELECT
  USER,
  ROUND(CURRENT_NUMBER_OF_BYTES_USED / 1024 / 1024, 2) AS current_mb,
  ROUND(HIGH_NUMBER_OF_BYTES_USED / 1024 / 1024, 2) AS peak_mb
FROM performance_schema.memory_summary_by_user_by_event_name
WHERE EVENT_NAME = 'memory/sql/Filesort_buffer::sort_keys'
   OR EVENT_NAME = 'memory/sql/THD::main_mem_root'
ORDER BY current_mb DESC;
```

## InnoDB Buffer Pool Memory Details

Check InnoDB buffer pool memory specifically:

```sql
SELECT
  EVENT_NAME,
  ROUND(CURRENT_NUMBER_OF_BYTES_USED / 1024 / 1024, 2) AS current_mb
FROM performance_schema.memory_summary_global_by_event_name
WHERE EVENT_NAME LIKE 'memory/innodb/%'
ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 10;
```

## Detecting Memory Growth Over Time

Take snapshots and compare to detect leaks:

```sql
-- Save current state
CREATE TABLE memory_snapshot AS
SELECT EVENT_NAME, CURRENT_NUMBER_OF_BYTES_USED, NOW() AS snapped_at
FROM performance_schema.memory_summary_global_by_event_name
WHERE CURRENT_NUMBER_OF_BYTES_USED > 0;

-- Compare later
SELECT
  n.EVENT_NAME,
  ROUND((n.CURRENT_NUMBER_OF_BYTES_USED - s.CURRENT_NUMBER_OF_BYTES_USED) / 1024 / 1024, 2) AS growth_mb
FROM performance_schema.memory_summary_global_by_event_name n
JOIN memory_snapshot s ON n.EVENT_NAME = s.EVENT_NAME
WHERE n.CURRENT_NUMBER_OF_BYTES_USED > s.CURRENT_NUMBER_OF_BYTES_USED
ORDER BY growth_mb DESC
LIMIT 10;
```

## Summary

The Performance Schema memory summary tables provide granular visibility into MySQL memory allocation. Use `memory_summary_global_by_event_name` for a server-wide view grouped by event type, `memory_summary_by_thread_by_event_name` to identify memory-hungry connections, and subsystem grouping to understand how InnoDB versus the SQL engine divides memory. Take periodic snapshots to detect gradual memory growth that may indicate a memory leak.

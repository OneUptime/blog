# What Is the Performance Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Monitoring, Query Optimization, Instrumentation

Description: The MySQL Performance Schema is a built-in instrumentation framework that collects detailed runtime statistics about server activity, queries, locks, and I/O.

---

## Overview

The Performance Schema is a storage engine in MySQL that captures low-level performance data from the server as it runs. It exposes this data as tables in the `performance_schema` database, which you query with standard SQL. Unlike slow query log files, it captures data in real time and provides granular breakdowns by user, host, schema, table, and individual statement.

The Performance Schema is enabled by default in MySQL 5.6+ and has negligible performance overhead in most workloads.

## Key Concepts

**Instruments**: Named measurement points embedded in MySQL source code. Each instrument can be enabled or disabled individually. Example: `statement/sql/select`, `wait/io/file/sql/binlog`.

**Consumers**: Tables that store the collected data. Instruments produce events; consumers decide what to record and where.

**Setup Tables**: Control what is instrumented and recorded:

```sql
-- See all available instruments
SELECT NAME, ENABLED, TIMED FROM performance_schema.setup_instruments
WHERE NAME LIKE 'statement/%' LIMIT 10;

-- Enable all statement instruments
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'statement/%';
```

## Finding Slow Queries

The `events_statements_summary_by_digest` table aggregates query statistics:

```sql
SELECT
  DIGEST_TEXT,
  COUNT_STAR AS exec_count,
  ROUND(AVG_TIMER_WAIT / 1e9, 2) AS avg_ms,
  ROUND(SUM_TIMER_WAIT / 1e9, 2) AS total_ms,
  SUM_ROWS_EXAMINED AS total_rows_examined
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

## Monitoring Lock Contention

The `data_locks` and `data_lock_waits` tables show current lock state:

```sql
-- See who is waiting for locks and who holds them
SELECT
  r.THREAD_ID AS waiting_thread,
  r.OBJECT_NAME AS waiting_table,
  b.THREAD_ID AS blocking_thread
FROM performance_schema.data_lock_waits w
JOIN performance_schema.data_locks r ON r.ENGINE_LOCK_ID = w.REQUESTING_ENGINE_LOCK_ID
JOIN performance_schema.data_locks b ON b.ENGINE_LOCK_ID = w.BLOCKING_ENGINE_LOCK_ID;
```

## Tracking I/O

```sql
-- Top files by total I/O bytes
SELECT
  FILE_NAME,
  COUNT_READ + COUNT_WRITE AS total_ops,
  ROUND((SUM_NUMBER_OF_BYTES_READ + SUM_NUMBER_OF_BYTES_WRITE) / 1048576, 2) AS total_mb
FROM performance_schema.file_summary_by_instance
ORDER BY total_mb DESC
LIMIT 10;
```

## Memory Usage

```sql
-- Memory consumption by event type
SELECT
  EVENT_NAME,
  CURRENT_COUNT_USED,
  ROUND(CURRENT_NUMBER_OF_BYTES_USED / 1048576, 2) AS current_mb
FROM performance_schema.memory_summary_global_by_event_name
WHERE CURRENT_NUMBER_OF_BYTES_USED > 0
ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC
LIMIT 10;
```

## Enabling Additional Consumers

By default some consumers are disabled to save overhead. Enable them as needed:

```sql
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN ('events_statements_history_long', 'events_waits_history_long');
```

## Relationship to the sys Schema

The `sys` schema (covered separately) provides pre-built views that wrap Performance Schema tables into human-readable reports, making common diagnostics easier without writing complex queries directly against Performance Schema.

## Summary

The MySQL Performance Schema is the primary instrumentation system for runtime diagnostics. It captures statement execution, lock waits, I/O activity, memory usage, and more at a granular level. Querying it with SQL allows deep, targeted investigation of performance problems that simpler tools cannot reveal. It is indispensable for serious MySQL performance tuning.

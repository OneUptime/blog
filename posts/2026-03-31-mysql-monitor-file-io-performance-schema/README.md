# How to Monitor File I/O with Performance Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, File I/O, Monitoring, Diagnostic

Description: Learn how to use MySQL Performance Schema file I/O tables to identify bottlenecks, track read/write latency, and optimize disk access patterns.

---

## Overview

Disk I/O is often the primary bottleneck in MySQL performance. The Performance Schema provides detailed file I/O instrumentation through the `file_summary_by_instance` and `file_summary_by_event_name` tables, giving you granular visibility into which files are causing the most latency.

## Enabling File I/O Instrumentation

Before querying file I/O data, ensure the relevant instruments and consumers are enabled:

```sql
-- Enable file I/O instruments
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'wait/io/file/%';

-- Enable the required consumers
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN ('events_waits_current', 'events_waits_history', 'global_instrumentation');
```

## Querying file_summary_by_instance

The `file_summary_by_instance` table shows cumulative I/O statistics per physical file:

```sql
SELECT
  FILE_NAME,
  COUNT_READ,
  SUM_NUMBER_OF_BYTES_READ / 1024 / 1024 AS read_mb,
  COUNT_WRITE,
  SUM_NUMBER_OF_BYTES_WRITE / 1024 / 1024 AS write_mb,
  SUM_TIMER_WAIT / 1e12 AS total_wait_sec
FROM performance_schema.file_summary_by_instance
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

This reveals which InnoDB tablespace files, redo logs, or binary logs are consuming the most I/O time.

## Using file_summary_by_event_name

For a higher-level view grouped by file type:

```sql
SELECT
  EVENT_NAME,
  COUNT_READ + COUNT_WRITE AS total_ops,
  SUM_NUMBER_OF_BYTES_READ + SUM_NUMBER_OF_BYTES_WRITE AS total_bytes,
  SUM_TIMER_WAIT / 1e12 AS total_wait_sec,
  MAX_TIMER_WAIT / 1e9 AS max_wait_ms
FROM performance_schema.file_summary_by_event_name
WHERE COUNT_READ + COUNT_WRITE > 0
ORDER BY SUM_TIMER_WAIT DESC;
```

## Finding the Worst Offenders

Identify files with the highest read latency per operation:

```sql
SELECT
  SUBSTRING_INDEX(FILE_NAME, '/', -1) AS file,
  COUNT_READ,
  ROUND(SUM_TIMER_READ / COUNT_READ / 1e9, 2) AS avg_read_ms,
  ROUND(MAX_TIMER_READ / 1e9, 2) AS max_read_ms
FROM performance_schema.file_summary_by_instance
WHERE COUNT_READ > 100
ORDER BY avg_read_ms DESC
LIMIT 10;
```

## Using the sys Schema for Simplified Views

The `sys` schema wraps file I/O data in human-readable format:

```sql
-- Top files by total I/O bytes
SELECT * FROM sys.io_global_by_file_by_bytes LIMIT 10;

-- Top files by latency
SELECT * FROM sys.io_global_by_file_by_latency LIMIT 10;
```

## Resetting Statistics

After tuning, reset counters to get a fresh baseline:

```sql
TRUNCATE TABLE performance_schema.file_summary_by_instance;
TRUNCATE TABLE performance_schema.file_summary_by_event_name;
```

## Interpreting Results

High `SUM_TIMER_WAIT` on `.ibd` files indicates InnoDB tablespace contention. High latency on `ib_logfile` suggests the redo log is a bottleneck - consider increasing `innodb_log_file_size`. Excessive binary log I/O can be reduced by tuning `sync_binlog` and `binlog_cache_size`.

## Summary

MySQL Performance Schema file I/O tables give you precise insight into disk access patterns. By querying `file_summary_by_instance` and leveraging `sys` schema views, you can pinpoint which files consume the most I/O time and take targeted action to reduce latency through configuration tuning or storage optimization.

# What Is the sys Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, Performance Schema, Monitoring, Diagnostic

Description: The MySQL sys schema is a collection of views, functions, and procedures that present Performance Schema data in human-readable format for quick diagnostics.

---

## Overview

The `sys` schema is a set of database objects installed by default in MySQL 5.7 and later. It wraps the complex raw tables of the Performance Schema in views that use human-readable formats -- showing byte sizes as `1.23 MiB`, times as `1.25 ms`, and grouping data by common use cases like finding slow statements or identifying hot tables. The `sys` schema does not store its own data; it reads from Performance Schema and INFORMATION_SCHEMA at query time.

## Enabling the Underlying Data

The sys schema relies on Performance Schema being enabled and consumers being active. Verify:

```sql
SHOW VARIABLES LIKE 'performance_schema';
-- Should return ON

SELECT NAME, ENABLED FROM performance_schema.setup_consumers
WHERE NAME LIKE 'events_statements%';
```

## Finding the Most Expensive Queries

```sql
-- Top 10 statements by total execution time
SELECT
  query,
  exec_count,
  total_latency,
  avg_latency,
  rows_examined_avg
FROM sys.statement_analysis
ORDER BY total_latency DESC
LIMIT 10;
```

## Identifying Unused Indexes

```sql
-- Indexes never used since the last server restart
SELECT * FROM sys.schema_unused_indexes
WHERE object_schema NOT IN ('mysql', 'sys', 'performance_schema');
```

## Detecting Full Table Scans

```sql
-- Tables being scanned without using an index
SELECT
  object_schema,
  object_name,
  rows_full_scanned,
  latency
FROM sys.schema_tables_with_full_table_scans
ORDER BY rows_full_scanned DESC;
```

## Monitoring User and Host Activity

```sql
-- Summary of activity per user
SELECT
  user,
  statements,
  total_connections,
  current_connections,
  statement_latency,
  table_scans
FROM sys.user_summary
ORDER BY statement_latency DESC;

-- Summary of activity per host
SELECT * FROM sys.host_summary;
```

## Memory Usage

```sql
-- Current memory allocation by source
SELECT
  user,
  current_allocated,
  total_allocated
FROM sys.memory_by_user_by_current_bytes
ORDER BY current_allocated DESC;
```

## I/O by File

```sql
-- Most I/O-intensive files
SELECT
  file,
  total,
  total_read,
  total_written,
  write_pct
FROM sys.io_global_by_file_by_bytes
ORDER BY total DESC
LIMIT 10;
```

## Useful Helper Functions

The sys schema includes formatting helper functions:

```sql
-- Convert bytes to human-readable
SELECT sys.format_bytes(1073741824);
-- Returns '1.00 GiB'

-- Convert picoseconds to human-readable
SELECT sys.format_time(1250000000);
-- Returns '1.25 ms'

-- Format a statement for display
SELECT sys.format_statement('SELECT a, b, c FROM t WHERE id = 1');
```

## Procedural Diagnostics

```sql
-- Full server diagnostics report
CALL sys.diagnostics(120, 30, 'current');

-- Generate a PS report for a specific thread
SELECT sys.ps_thread_trx_info(42)\G
```

## Summary

The sys schema makes Performance Schema data approachable by presenting it in named views with human-readable formatting. It is the starting point for most MySQL performance investigations: finding slow queries, unused indexes, lock contention, and memory pressure without writing raw Performance Schema SQL. It ships with MySQL and requires no installation beyond enabling the Performance Schema.

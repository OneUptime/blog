# How to Use the user_summary View in MySQL sys Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, User, Monitoring, Performance

Description: Learn how to use the MySQL sys schema user_summary view for per-database-user performance monitoring, covering statement latency, I/O, and memory usage.

---

## Overview

The `sys.user_summary` view aggregates MySQL activity by database user account. It is the primary tool for understanding which users or service accounts consume the most server resources, helping with both performance optimization and capacity planning.

## Basic Query

```sql
SELECT *
FROM sys.user_summary\G
```

## Key Columns

```sql
SELECT
  user,
  statements,
  statement_latency,
  statement_avg_latency,
  table_scans,
  file_ios,
  file_io_latency,
  current_connections,
  total_connections,
  unique_hosts,
  current_memory,
  total_memory_allocated
FROM sys.user_summary
ORDER BY statements DESC;
```

Column meanings:
- `user` - MySQL username (`background` for internal server threads)
- `statements` - total SQL statements executed since last restart or truncation
- `statement_avg_latency` - mean statement execution time
- `table_scans` - full table scans triggered by this user
- `current_connections` - active connections right now
- `unique_hosts` - number of distinct client hosts for this user
- `current_memory` - bytes currently allocated to this user's sessions

## Finding Users with the Most Table Scans

```sql
SELECT
  user,
  table_scans,
  statements,
  ROUND(table_scans / statements * 100, 1) AS scan_pct
FROM sys.user_summary
WHERE statements > 0
  AND user != 'background'
ORDER BY table_scans DESC;
```

## Spotting Memory-Heavy Users

```sql
SELECT
  user,
  current_connections,
  current_memory,
  total_memory_allocated
FROM sys.user_summary
WHERE user != 'background'
ORDER BY current_memory DESC;
```

## Detailed Statement Breakdown Per User

```sql
SELECT
  user,
  statement,
  total,
  total_latency,
  max_latency,
  rows_sent,
  rows_examined
FROM sys.user_summary_by_statement_type
WHERE user = 'app_rw'
ORDER BY total_latency DESC;
```

## File I/O Breakdown Per User

```sql
SELECT user, ios, io_latency
FROM sys.user_summary_by_file_io
ORDER BY io_latency DESC;
```

## Using the x$ Raw Data Variant

```sql
SELECT
  user,
  statements,
  statement_latency / 1e12 AS total_latency_sec,
  current_memory / 1024 / 1024 AS current_memory_mb
FROM sys.x$user_summary
ORDER BY statement_latency DESC;
```

## Resetting User Statistics

```sql
-- Reset per-user statement statistics
TRUNCATE TABLE performance_schema.events_statements_summary_by_user_by_event_name;
```

## Summary

The `sys.user_summary` view gives a per-user breakdown of statement counts, execution latency, full table scans, file I/O, and memory usage. This is essential for multi-tenant or multi-service MySQL deployments where you need to attribute resource consumption to specific application accounts and enforce per-user performance budgets.

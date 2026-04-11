# How to Use the statement_analysis View in MySQL sys Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, Statement, Query Analysis, Performance

Description: Learn how to use the MySQL sys schema statement_analysis view to analyze normalized query performance, identify bottlenecks, and prioritize optimization efforts.

---

## Overview

The `sys.statement_analysis` view is one of the most useful tools in the MySQL `sys` schema. It wraps the `events_statements_summary_by_digest` Performance Schema table and presents query performance data in a human-readable format with pre-computed averages and formatted durations.

## Basic Query

```sql
SELECT
  query,
  db,
  exec_count,
  total_latency,
  avg_latency,
  max_latency,
  rows_sent_avg,
  rows_examined_avg,
  first_seen,
  last_seen
FROM sys.statement_analysis
ORDER BY total_latency DESC
LIMIT 10;
```

## Available Columns

The view includes many useful columns:

```sql
DESCRIBE sys.statement_analysis;
```

Key columns include:
- `query` - normalized SQL text with literals replaced by `?`
- `db` - default schema
- `exec_count` - total executions
- `total_latency` - cumulative execution time (human-readable)
- `avg_latency` - average execution time
- `lock_latency` - total time waiting for locks
- `rows_sent_avg` - average rows returned
- `rows_examined_avg` - average rows scanned
- `tmp_tables` - temporary tables created in memory
- `tmp_disk_tables` - temporary tables created on disk
- `rows_sorted` - total rows sorted
- `sort_merge_passes` - total sort merge passes
- `full_scan` - flag (`*` if full table scan was used, empty otherwise)

## Finding Lock-Heavy Queries

```sql
SELECT
  query,
  exec_count,
  total_latency,
  lock_latency,
  ROUND(lock_latency / total_latency * 100, 1) AS lock_pct
FROM sys.x$statement_analysis
WHERE exec_count > 10
ORDER BY lock_latency DESC
LIMIT 10;
```

## Identifying Sort-Heavy Queries

```sql
SELECT
  query,
  exec_count,
  rows_sorted,
  sort_merge_passes,
  total_latency
FROM sys.statement_analysis
WHERE rows_sorted > 1000
ORDER BY rows_sorted DESC
LIMIT 10;
```

## Finding Inconsistently Performing Queries

Queries where max latency is much higher than average indicate occasional slow execution:

```sql
SELECT
  query,
  exec_count,
  avg_latency,
  max_latency
FROM sys.statement_analysis
WHERE exec_count > 100
ORDER BY max_latency DESC
LIMIT 10;
```

## Filtering by Database

```sql
SELECT query, exec_count, avg_latency, full_scan
FROM sys.statement_analysis
WHERE db = 'ecommerce'
ORDER BY avg_latency DESC
LIMIT 10;
```

## Summary

The `sys.statement_analysis` view is the single most comprehensive starting point for MySQL query performance analysis. By examining total latency, lock time, temp disk tables, and full scan counts, you can quickly build a prioritized list of queries to optimize and measure the impact of improvements over time.

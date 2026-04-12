# How to Find Tables with Full Table Scans Using sys Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, Table Scan, Index, Query Optimization

Description: Use MySQL sys schema views to identify tables that are frequently accessed via full table scans, and fix them with targeted index additions.

---

## Overview

A full table scan means MySQL reads every row in a table to satisfy a query. On large tables, full scans cause massive I/O, high CPU usage, and long query times. The `sys` schema provides several views to pinpoint which tables and queries are causing full scans.

## Using schema_tables_with_full_table_scans

```sql
SELECT
  object_schema,
  object_name,
  rows_full_scanned,
  latency
FROM sys.schema_tables_with_full_table_scans
ORDER BY rows_full_scanned DESC
LIMIT 10;
```

## Finding Queries That Cause Full Scans

```sql
SELECT
  query,
  exec_count,
  total_latency,
  no_index_used_count,
  no_good_index_used_count
FROM sys.statements_with_full_table_scans
ORDER BY no_index_used_count DESC
LIMIT 10;
```

## Querying Performance Schema Directly

The underlying data comes from `table_io_waits_summary_by_index_usage`:

```sql
SELECT
  OBJECT_SCHEMA,
  OBJECT_NAME,
  COUNT_READ AS full_scan_reads,
  SUM_TIMER_READ / 1e12 AS total_read_sec
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE INDEX_NAME IS NULL
ORDER BY COUNT_READ DESC
LIMIT 15;
```

`INDEX_NAME IS NULL` specifically identifies full table scan access.

## Cross-Referencing with Table Sizes

Combine with INFORMATION_SCHEMA to find large tables suffering full scans:

```sql
SELECT
  t.TABLE_SCHEMA,
  t.TABLE_NAME,
  t.TABLE_ROWS,
  ps.COUNT_READ AS full_scan_count,
  ROUND(t.DATA_LENGTH / 1024 / 1024, 1) AS data_mb
FROM information_schema.TABLES t
JOIN performance_schema.table_io_waits_summary_by_index_usage ps
  ON t.TABLE_SCHEMA = ps.OBJECT_SCHEMA
  AND t.TABLE_NAME = ps.OBJECT_NAME
WHERE ps.INDEX_NAME IS NULL
  AND ps.COUNT_READ > 0
  AND t.TABLE_ROWS > 10000
ORDER BY ps.COUNT_READ DESC
LIMIT 10;
```

## Diagnosing the Cause with EXPLAIN

Once you identify a table with many full scans, find the queries:

```sql
SELECT DIGEST_TEXT, COUNT_STAR
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT LIKE '%orders%'
  AND SUM_NO_INDEX_USED > 0
ORDER BY SUM_NO_INDEX_USED DESC
LIMIT 5;
```

Then run EXPLAIN:

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'pending' AND created_at > '2026-01-01';
```

If the output shows `type: ALL`, you need an index:

```sql
ALTER TABLE orders ADD INDEX idx_status_created (status, created_at);
```

## Summary

The `sys.schema_tables_with_full_table_scans` and `sys.statements_with_full_table_scans` views expose the tables and queries most affected by missing indexes. By cross-referencing with table sizes and using EXPLAIN to understand query access patterns, you can add targeted composite indexes that eliminate full scans and dramatically improve query response times.

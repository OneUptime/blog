# How to Monitor Table I/O with Performance Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, I/O, Table, Monitoring

Description: Learn how to use MySQL Performance Schema table I/O instrumentation to identify hot tables, slow read/write operations, and I/O bottlenecks.

---

The MySQL Performance Schema tracks I/O activity at the table and index level, making it possible to identify which tables generate the most I/O operations, which indexes are slow, and where I/O latency is concentrated. This data guides index optimization and storage planning.

## Enabling Table I/O Instrumentation

Verify table I/O instruments are enabled:

```sql
SELECT NAME, ENABLED, TIMED
FROM performance_schema.setup_instruments
WHERE NAME LIKE 'wait/io/table/%';
```

Enable them if needed:

```sql
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'wait/io/table/%';

UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN ('events_waits_current', 'events_waits_history_long');
```

## Finding the Busiest Tables by I/O Count

```sql
SELECT
  OBJECT_SCHEMA AS db,
  OBJECT_NAME AS table_name,
  COUNT_STAR AS total_io,
  COUNT_READ,
  COUNT_WRITE,
  COUNT_FETCH,
  COUNT_INSERT,
  COUNT_UPDATE,
  COUNT_DELETE
FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema', 'sys')
ORDER BY COUNT_STAR DESC
LIMIT 20;
```

## Finding Tables with the Highest I/O Latency

High I/O count is not always the problem - high latency per operation indicates slow storage or missing indexes:

```sql
SELECT
  OBJECT_SCHEMA AS db,
  OBJECT_NAME AS table_name,
  ROUND(SUM_TIMER_WAIT / 1000000000000, 4) AS total_latency_secs,
  ROUND(AVG_TIMER_WAIT / 1000000000, 4) AS avg_latency_ms,
  COUNT_STAR AS io_count
FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema', 'sys')
  AND COUNT_STAR > 0
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;
```

## I/O Breakdown by Index

Identify which indexes generate the most I/O on a specific table:

```sql
SELECT
  INDEX_NAME,
  COUNT_FETCH,
  COUNT_INSERT,
  ROUND(SUM_TIMER_FETCH / 1000000000, 2) AS fetch_latency_ms,
  ROUND(AVG_TIMER_FETCH / 1000000000, 4) AS avg_fetch_ms
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'mydb'
  AND OBJECT_NAME = 'orders'
ORDER BY SUM_TIMER_FETCH DESC;
```

A `NULL` index name means no index was used. For fetch operations, this indicates a full table scan. Note that all inserts also appear under `NULL` since they do not use an index for the write itself. High fetch counts here indicate a missing index.

## Detecting Full Table Scans

Find tables where most reads are full table scans:

```sql
SELECT
  OBJECT_SCHEMA AS db,
  OBJECT_NAME AS table_name,
  COUNT_FETCH AS index_reads,
  (
    SELECT COUNT_FETCH
    FROM performance_schema.table_io_waits_summary_by_index_usage s2
    WHERE s2.OBJECT_SCHEMA = s.OBJECT_SCHEMA
      AND s2.OBJECT_NAME = s.OBJECT_NAME
      AND s2.INDEX_NAME IS NULL
  ) AS full_scan_reads
FROM performance_schema.table_io_waits_summary_by_index_usage s
WHERE INDEX_NAME = 'PRIMARY'
  AND OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'sys')
ORDER BY full_scan_reads DESC
LIMIT 10;
```

## Using the sys Schema for Table I/O

The `sys` schema provides pre-built views that are easier to read:

```sql
-- Top tables by total I/O latency
SELECT * FROM sys.schema_table_statistics
ORDER BY total_latency DESC
LIMIT 10;

-- Tables with the most full table scans
SELECT * FROM sys.schema_tables_with_full_table_scans
ORDER BY rows_full_scanned DESC
LIMIT 10;
```

## Resetting I/O Statistics

After making optimization changes, reset the counters to measure from a clean baseline:

```sql
TRUNCATE TABLE performance_schema.table_io_waits_summary_by_table;
TRUNCATE TABLE performance_schema.table_io_waits_summary_by_index_usage;
```

## Summary

Performance Schema table I/O instrumentation reveals which tables and indexes are responsible for the most I/O operations and latency. Use `table_io_waits_summary_by_table` to find hot tables, `table_io_waits_summary_by_index_usage` to identify missing indexes through `NULL` index entries, and the `sys` schema views for a quick summary. High average latency per operation points to storage I/O bottlenecks or inefficient queries; high row counts with full scans point to missing or unused indexes.

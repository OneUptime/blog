# How to Use schema_table_statistics in MySQL sys Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, Table Statistics, Performance Monitoring, I/O Analysis

Description: Learn how to use the schema_table_statistics view in the MySQL sys schema to analyze table-level I/O, row operations, and query latency per table.

---

## What Is schema_table_statistics?

The `schema_table_statistics` view in the MySQL `sys` schema provides aggregated statistics for each table, including total I/O latency, rows fetched, inserted, updated, and deleted. It is built on top of the `performance_schema.table_io_waits_summary_by_table` and `performance_schema.file_summary_by_instance` tables and formats values in a human-readable way.

This view is invaluable for identifying the most active or slowest tables in your database.

## Prerequisites

Performance Schema must be enabled with table I/O instruments active:

```sql
-- Check if Performance Schema is enabled
SHOW VARIABLES LIKE 'performance_schema';

-- Enable table I/O instruments if not already on
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'wait/io/table/%';

UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN ('events_waits_current', 'events_waits_history', 'events_waits_history_long');
```

## Basic Query

```sql
SELECT *
FROM sys.schema_table_statistics
LIMIT 10;
```

## Column Reference

| Column | Description |
|--------|-------------|
| `table_schema` | The database name |
| `table_name` | The table name |
| `total_latency` | Total I/O wait time (human-readable) |
| `rows_fetched` | Total rows read/fetched |
| `fetch_latency` | Total latency for fetch operations |
| `rows_inserted` | Total rows inserted |
| `insert_latency` | Total latency for insert operations |
| `rows_updated` | Total rows updated |
| `update_latency` | Total latency for update operations |
| `rows_deleted` | Total rows deleted |
| `delete_latency` | Total latency for delete operations |
| `io_read_requests` | Total read I/O requests |
| `io_read` | Total bytes read |
| `io_read_latency` | Total latency for read I/O |
| `io_write_requests` | Total write I/O requests |
| `io_write` | Total bytes written |
| `io_write_latency` | Total latency for write I/O |
| `io_misc_requests` | Total miscellaneous I/O requests |
| `io_misc_latency` | Total latency for miscellaneous I/O |

## Finding the Most Active Tables

```sql
SELECT
  table_schema,
  table_name,
  total_latency,
  rows_fetched,
  rows_inserted + rows_updated + rows_deleted AS total_writes
FROM sys.schema_table_statistics
ORDER BY total_latency DESC
LIMIT 10;
```

## Finding Tables With Most Read Activity

```sql
SELECT
  table_schema,
  table_name,
  rows_fetched,
  fetch_latency
FROM sys.schema_table_statistics
ORDER BY rows_fetched DESC
LIMIT 10;
```

## Finding Tables With Most Write Activity

```sql
SELECT
  table_schema,
  table_name,
  rows_inserted,
  rows_updated,
  rows_deleted,
  insert_latency,
  update_latency,
  delete_latency
FROM sys.schema_table_statistics
WHERE table_schema NOT IN ('mysql', 'sys', 'information_schema', 'performance_schema')
ORDER BY rows_inserted + rows_updated + rows_deleted DESC
LIMIT 10;
```

## Finding High-Latency Tables

```sql
SELECT
  table_schema,
  table_name,
  total_latency
FROM sys.schema_table_statistics
WHERE table_schema NOT IN ('mysql', 'sys', 'information_schema', 'performance_schema')
ORDER BY total_latency DESC
LIMIT 5;
```

## Using the Raw x$ View for Scripting

For programmatic access or threshold-based alerting, use the `x$` version which returns numeric values (in picoseconds):

```sql
SELECT
  table_schema,
  table_name,
  total_latency,
  rows_fetched
FROM sys.x$schema_table_statistics
WHERE total_latency > 1000000000000  -- > 1 second in picoseconds
ORDER BY total_latency DESC;
```

## Filtering by Database

```sql
SELECT
  table_name,
  total_latency,
  rows_fetched,
  rows_inserted,
  rows_updated,
  rows_deleted
FROM sys.schema_table_statistics
WHERE table_schema = 'myapp'
ORDER BY total_latency DESC;
```

## Monitoring I/O at the File Level

For disk-level I/O analysis by table, complement this view with:

```sql
SELECT
  file,
  total_latency,
  count_read,
  count_write,
  total
FROM sys.io_global_by_file_by_latency
WHERE file LIKE '%myapp%'
ORDER BY total_latency DESC;
```

## Resetting Statistics

To reset accumulated statistics without restarting MySQL:

```sql
TRUNCATE TABLE performance_schema.table_io_waits_summary_by_table;
```

After truncation, `schema_table_statistics` will reflect only activity since the truncation.

## Summary

The `schema_table_statistics` view in MySQL's sys schema gives a clear picture of table-level I/O and row operation activity. It helps you quickly identify which tables are causing the most load, enabling targeted optimization such as adding indexes, partitioning heavily read tables, or archiving stale data from high-write tables.

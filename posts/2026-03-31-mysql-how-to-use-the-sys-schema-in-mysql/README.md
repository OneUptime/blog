# How to Use the sys Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, Performance Monitoring, Database Diagnostics, DBA

Description: Learn how to use the MySQL sys schema to simplify performance monitoring, identify slow queries, and analyze server activity with human-readable views.

---

## What Is the sys Schema?

The **sys schema** is a collection of views, stored procedures, and functions introduced in MySQL 5.7 that makes it easier to work with Performance Schema data. Instead of writing complex queries against raw `performance_schema` tables, you can use `sys` views that format data in a human-readable way.

It is installed by default in MySQL 5.7+ and MySQL 8.0.

## Checking If sys Schema Is Available

```sql
SHOW DATABASES LIKE 'sys';
```

```sql
USE sys;
SHOW TABLES;
```

## Key Views in the sys Schema

The `sys` schema provides views in two forms:
- **Standard views** - formatted for human reading (e.g., `1.23 ms`, `16.00 MiB`)
- **Raw views** prefixed with `x$` - returns raw numbers, useful for programmatic use

## Finding Top Queries by Execution Time

```sql
SELECT
  query,
  exec_count,
  total_latency,
  avg_latency,
  rows_sent_avg
FROM sys.statement_analysis
ORDER BY total_latency DESC
LIMIT 10;
```

## Finding Queries That Do Full Table Scans

```sql
SELECT
  query,
  exec_count,
  total_latency,
  no_index_used_count
FROM sys.statements_with_full_table_scans
ORDER BY no_index_used_count DESC
LIMIT 10;
```

## Finding Unused Indexes

```sql
SELECT
  object_schema,
  object_name,
  index_name
FROM sys.schema_unused_indexes
WHERE object_schema NOT IN ('mysql', 'sys', 'information_schema', 'performance_schema');
```

## Identifying Redundant Indexes

```sql
SELECT *
FROM sys.schema_redundant_indexes
WHERE table_schema NOT IN ('mysql', 'sys');
```

## Viewing Table I/O Statistics

```sql
SELECT
  table_schema,
  table_name,
  total_latency,
  rows_fetched,
  fetch_latency,
  rows_inserted,
  rows_updated,
  rows_deleted
FROM sys.schema_table_statistics
ORDER BY total_latency DESC
LIMIT 10;
```

## Viewing Current Active Sessions

```sql
SELECT
  thd_id,
  conn_id,
  user,
  db,
  command,
  state,
  time,
  current_statement
FROM sys.session
WHERE command != 'Sleep'
ORDER BY time DESC;
```

## Finding Tables Without a Primary Key

```sql
SELECT
  tables.table_schema,
  tables.table_name
FROM information_schema.tables
LEFT JOIN information_schema.table_constraints tc
  ON tables.table_schema = tc.table_schema
  AND tables.table_name = tc.table_name
  AND tc.constraint_type = 'PRIMARY KEY'
WHERE tc.table_name IS NULL
  AND tables.table_type = 'BASE TABLE'
  AND tables.table_schema NOT IN ('mysql', 'sys', 'information_schema', 'performance_schema');
```

## Viewing Memory Usage by User

```sql
SELECT
  user,
  current_allocated,
  total_allocated
FROM sys.memory_by_user_by_current_bytes
ORDER BY current_allocated DESC;
```

## Viewing I/O by File

```sql
SELECT
  file,
  total_latency,
  count_read,
  read_latency,
  count_write,
  write_latency
FROM sys.io_global_by_file_by_latency
ORDER BY total_latency DESC
LIMIT 10;
```

## Using Stored Procedures in sys Schema

### Generate a Diagnostics Report

```sql
CALL sys.diagnostics(120, 30, 'current');
```

This runs a 120-second diagnostic with 30-second intervals.

### View Table Details

```sql
CALL sys.table_exists('mydb', 'orders', @table_type);
SELECT @table_type;
```

## Using Raw Views for Programmatic Access

Raw views (prefixed with `x$`) return unformatted numeric values:

```sql
SELECT
  query,
  exec_count,
  total_latency,  -- picoseconds as a number
  avg_latency
FROM sys.x$statement_analysis
ORDER BY total_latency DESC
LIMIT 5;
```

## Summary

The MySQL sys schema provides a developer-friendly layer over Performance Schema with pre-built views for queries, indexes, I/O, sessions, and memory. It simplifies DBA work by presenting data in human-readable formats. Use the standard views for quick analysis and the `x$` raw views when writing scripts or automation that need numeric values.

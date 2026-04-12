# How to Use the host_summary View in MySQL sys Schema

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, Host, Connection, Performance

Description: Learn how to use the MySQL sys schema host_summary view to get a per-host breakdown of connections, statements, I/O, and memory usage.

---

## Overview

The `sys.host_summary` view aggregates MySQL activity by client host. It is the quickest way to see which application servers or client machines are consuming the most database resources. The view combines data from multiple Performance Schema tables into a single, unified summary.

## Basic Query

```sql
SELECT *
FROM sys.host_summary
ORDER BY statements DESC\G
```

## Key Columns Explained

```sql
SELECT
  host,
  statements,
  statement_latency,
  statement_avg_latency,
  table_scans,
  file_ios,
  file_io_latency,
  current_connections,
  total_connections,
  unique_users,
  current_memory,
  total_memory_allocated
FROM sys.host_summary;
```

- `host` - client hostname or IP address (`background` for internal threads)
- `statements` - total SQL statements executed
- `statement_latency` - total execution time (formatted)
- `statement_avg_latency` - average statement duration
- `table_scans` - number of full table scans
- `file_ios` - total file I/O operations
- `current_connections` - live connections from this host
- `current_memory` - currently allocated memory for this host's sessions
- `total_memory_allocated` - cumulative memory allocated

## Identifying High-Load Hosts

```sql
SELECT
  host,
  statements,
  statement_latency,
  current_connections,
  table_scans
FROM sys.host_summary
WHERE host != 'background'
ORDER BY statement_latency DESC;
```

## Comparing Statement Averages Across Hosts

If some hosts have higher average latency than others with the same application code, it may indicate network issues, different connection pool sizes, or different query patterns:

```sql
SELECT
  host,
  statements,
  statement_avg_latency,
  file_io_latency
FROM sys.host_summary
WHERE host != 'background'
ORDER BY statement_avg_latency DESC;
```

## Checking Memory Usage Per Host

```sql
SELECT
  host,
  current_connections,
  current_memory,
  total_memory_allocated
FROM sys.host_summary
ORDER BY current_memory DESC;
```

## Using the x$ Variant for Numeric Data

The `sys` schema provides raw numeric versions of views prefixed with `x$` for programmatic use:

```sql
SELECT
  host,
  statements,
  statement_latency,   -- raw picoseconds
  current_memory       -- raw bytes
FROM sys.x$host_summary
ORDER BY statement_latency DESC;
```

## Combining with host_summary_by_statement_type

```sql
SELECT
  host,
  statement,
  total,
  total_latency,
  rows_sent
FROM sys.host_summary_by_statement_type
WHERE host = '10.0.0.5'
ORDER BY total_latency DESC;
```

## Summary

The `sys.host_summary` view provides a clean, high-level view of per-client-host MySQL activity. Use it to quickly identify which application servers generate the most load, have the highest table scan rates, or consume the most memory, then drill into specific hosts using the `host_summary_by_statement_type` and `host_summary_by_file_io` companion views.

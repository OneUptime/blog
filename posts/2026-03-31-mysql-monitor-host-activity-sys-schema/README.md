# How to Monitor Host Activity with sys Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, sys Schema, Host, Monitoring, Connection

Description: Use MySQL sys schema host_summary views to monitor per-host connection counts, query activity, I/O statistics, and memory usage.

---

## Overview

When multiple application servers or services connect to MySQL, you need per-host visibility to identify which hosts are generating the most load. The `sys` schema `host_summary` family of views aggregates Performance Schema data by client hostname, making this analysis simple.

## Using host_summary

The main `host_summary` view provides a comprehensive per-host overview:

```sql
SELECT
  host,
  statements,
  statement_latency,
  total_connections,
  unique_users,
  current_memory,
  total_memory_allocated
FROM sys.host_summary
ORDER BY statements DESC;
```

## host_summary_by_statement_latency

Find which hosts are running the slowest queries:

```sql
SELECT
  host,
  total,
  total_latency,
  max_latency,
  lock_latency
FROM sys.host_summary_by_statement_latency
ORDER BY total_latency DESC;
```

## host_summary_by_statement_type

Break down statement types per host to understand workload characteristics:

```sql
SELECT
  host,
  statement,
  total,
  total_latency,
  rows_sent,
  rows_examined
FROM sys.host_summary_by_statement_type
WHERE host = 'app-server-01'
ORDER BY total_latency DESC;
```

## host_summary_by_file_io

Identify which hosts are causing the most file I/O:

```sql
SELECT
  host,
  ios,
  io_latency
FROM sys.host_summary_by_file_io
ORDER BY io_latency DESC;
```

## host_summary_by_stages

See which execution stages consume the most time per host:

```sql
SELECT
  host,
  event_name,
  total,
  total_latency,
  avg_latency
FROM sys.host_summary_by_stages
WHERE host = 'app-server-01'
ORDER BY total_latency DESC;
```

## Querying the Underlying Performance Schema Tables

```sql
-- Per-host connection and statement counts
SELECT
  h.HOST,
  h.CURRENT_CONNECTIONS,
  h.TOTAL_CONNECTIONS,
  SUM(s.COUNT_STAR) AS total_statements
FROM performance_schema.hosts h
LEFT JOIN performance_schema.events_statements_summary_by_host_by_event_name s
  ON h.HOST = s.HOST
WHERE h.HOST IS NOT NULL
GROUP BY h.HOST, h.CURRENT_CONNECTIONS, h.TOTAL_CONNECTIONS
ORDER BY h.CURRENT_CONNECTIONS DESC;
```

## Identifying Problematic Hosts

Hosts with high latency but low connection counts may indicate slow queries. Hosts with high connection counts but low latency may indicate connection pooling issues:

```sql
SELECT
  host,
  total_connections,
  statements,
  ROUND(statement_latency / statements / 1000000000, 2) AS avg_stmt_latency_ms
FROM sys.x$host_summary
WHERE statements > 0
ORDER BY avg_stmt_latency_ms DESC;
```

## Summary

The `sys.host_summary` family of views provides a complete per-host breakdown of MySQL activity. By comparing statement latency, I/O activity, and connection counts across hosts, you can identify misconfigured application servers, unbalanced connection pools, or hosts running inefficient query patterns that affect the overall database workload.

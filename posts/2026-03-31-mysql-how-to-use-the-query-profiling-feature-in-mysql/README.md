# How to Use the Query Profiling Feature in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Profiling, Performance Schema, Slow Query Log, Optimization

Description: Learn how to profile MySQL queries using the Performance Schema, slow query log, and other built-in tools to identify and fix slow queries.

---

## Overview

MySQL provides multiple tools for query profiling and performance analysis. While `SHOW PROFILE` offers per-query timing breakdowns, the Performance Schema and the slow query log provide more comprehensive, production-ready profiling capabilities.

This guide covers all the major profiling approaches and when to use each one.

## Method 1: The Slow Query Log

The slow query log captures queries that exceed a configurable execution time threshold. It is the standard production profiling tool.

### Enabling the Slow Query Log

```sql
-- Check current status
SHOW VARIABLES LIKE 'slow_query_log%';

-- Enable dynamically (affects all new connections)
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 1;  -- Log queries taking > 1 second
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

Or configure in `my.cnf` for persistence:

```text
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = 1
```

### Reading the Slow Query Log

```text
# Time: 2025-06-15T14:32:01.123456Z
# User@Host: appuser[appuser] @ localhost []
# Query_time: 4.523819  Lock_time: 0.000043  Rows_sent: 1000  Rows_examined: 2500000
SET timestamp=1750000321;
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at;
```

Key fields: `Query_time`, `Lock_time`, `Rows_sent`, `Rows_examined`. A large ratio of `Rows_examined` to `Rows_sent` indicates missing indexes.

### Analyzing with mysqldumpslow

```bash
# Top 10 slowest queries
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log

# Top 10 by average time
mysqldumpslow -s at -t 10 /var/log/mysql/slow.log

# Queries matching a pattern
mysqldumpslow -g "orders" /var/log/mysql/slow.log
```

## Method 2: Performance Schema

The Performance Schema provides real-time query statistics with minimal overhead.

### Enabling Statement Instrumentation

```sql
-- Check if statements are instrumented
SELECT * FROM performance_schema.setup_instruments
WHERE name LIKE 'statement/%' AND enabled = 'NO'
LIMIT 5;

-- Enable all statement instruments
UPDATE performance_schema.setup_instruments
SET enabled = 'YES', timed = 'YES'
WHERE name LIKE 'statement/%';
```

### Finding the Top Slow Statements

```sql
SELECT digest_text,
       count_star AS executions,
       ROUND(avg_timer_wait / 1e12, 4) AS avg_seconds,
       ROUND(sum_timer_wait / 1e12, 4) AS total_seconds,
       sum_rows_examined,
       sum_no_index_used
FROM performance_schema.events_statements_summary_by_digest
ORDER BY sum_timer_wait DESC
LIMIT 10;
```

### Finding Queries Without Indexes

```sql
SELECT digest_text, sum_no_index_used, count_star
FROM performance_schema.events_statements_summary_by_digest
WHERE sum_no_index_used > 0
ORDER BY sum_no_index_used DESC
LIMIT 10;
```

## Method 3: sys Schema Shortcuts

The sys schema provides user-friendly views over Performance Schema data:

```sql
-- Top statements by total latency
SELECT * FROM sys.statement_analysis
ORDER BY total_latency DESC
LIMIT 10;

-- Statements with full table scans
SELECT * FROM sys.statements_with_full_table_scans
ORDER BY exec_count DESC
LIMIT 10;

-- Statements with sorting
SELECT * FROM sys.statements_with_sorting
ORDER BY total_latency DESC
LIMIT 10;
```

## Method 4: EXPLAIN ANALYZE for Individual Queries

For deep analysis of a specific query:

```sql
EXPLAIN ANALYZE
SELECT o.id, u.email, o.total
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 50;
```

This shows actual execution times and row counts alongside estimates, making it easy to spot where estimates diverge from reality.

## Comparing Before and After Optimization

```sql
-- Baseline measurement
SELECT digest_text,
       count_star,
       ROUND(avg_timer_wait / 1e12, 6) AS avg_seconds
FROM performance_schema.events_statements_summary_by_digest
WHERE digest_text LIKE '%orders%status%'
ORDER BY avg_timer_wait DESC
LIMIT 5;

-- Add your index
CREATE INDEX idx_status_date ON orders (status, created_at);

-- Reset statistics
TRUNCATE performance_schema.events_statements_summary_by_digest;

-- Re-run your workload, then measure again
SELECT digest_text,
       count_star,
       ROUND(avg_timer_wait / 1e12, 6) AS avg_seconds
FROM performance_schema.events_statements_summary_by_digest
WHERE digest_text LIKE '%orders%status%'
ORDER BY avg_timer_wait DESC
LIMIT 5;
```

## Summary

MySQL's query profiling ecosystem includes the slow query log for production-level query capture, Performance Schema for real-time aggregate statistics, the sys schema for simplified views, and `EXPLAIN ANALYZE` for deep single-query analysis. Use the slow query log with `long_query_time = 1` as your first line of defense in production, use `sys.statement_analysis` to find systemic slow queries across the workload, and use `EXPLAIN ANALYZE` to investigate individual problematic queries.

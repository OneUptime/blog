# What Is the Slow Query Log in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Slow Query Log, Performance Tuning, Query Optimization

Description: The MySQL slow query log captures queries that exceed a configurable execution time threshold, helping you identify and fix performance bottlenecks.

---

## Overview

The slow query log is a MySQL diagnostic feature that records SQL statements that take longer than a specified number of seconds to execute. It is one of the most useful tools for identifying performance bottlenecks without the overhead of logging every single query.

Unlike the general query log, the slow query log is safe to leave enabled in production with an appropriate threshold.

## Checking Current Configuration

```sql
SHOW VARIABLES LIKE 'slow_query_log%';
SHOW VARIABLES LIKE 'long_query_time';
SHOW VARIABLES LIKE 'log_queries_not_using_indexes';
```

## Enabling the Slow Query Log

### At Runtime

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 1;  -- Log queries taking > 1 second
SET GLOBAL log_queries_not_using_indexes = ON;
```

### In Configuration File

```text
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = 1
log_throttle_queries_not_using_indexes = 10
min_examined_row_limit = 1000
```

## Key Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `long_query_time` | 10 | Threshold in seconds (supports decimals) |
| `log_queries_not_using_indexes` | OFF | Log queries without index usage |
| `log_slow_admin_statements` | OFF | Include slow ALTER, OPTIMIZE, etc. |
| `min_examined_row_limit` | 0 | Min rows examined before logging |

## Example Slow Query Log Entry

```text
# Time: 2026-03-31T10:15:22.123456Z
# User@Host: app_user[app_user] @ [10.0.0.5]  Id: 1042
# Query_time: 3.456789  Lock_time: 0.000123  Rows_sent: 1  Rows_examined: 500000
SET timestamp=1774952122;
SELECT * FROM orders WHERE status = 'pending' AND created_at < '2026-01-01';
```

## Using mysqldumpslow to Analyze the Log

```bash
# Show top 10 slowest queries
mysqldumpslow -t 10 /var/log/mysql/slow.log

# Sort by query count
mysqldumpslow -s c -t 10 /var/log/mysql/slow.log

# Sort by total time
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log

# Show queries matching a pattern
mysqldumpslow -s at -t 5 /var/log/mysql/slow.log | grep "SELECT"
```

## Using pt-query-digest (Percona Toolkit)

```bash
# Install percona toolkit
apt-get install percona-toolkit

# Analyze slow query log
pt-query-digest /var/log/mysql/slow.log

# Filter to last hour
pt-query-digest --since=1h /var/log/mysql/slow.log

# Output to a file
pt-query-digest /var/log/mysql/slow.log > report.txt
```

## Example Workflow: Finding and Fixing a Slow Query

Step 1 - Identify the slow query from the log:

```text
# Query_time: 5.200000  Rows_examined: 2000000
SELECT * FROM users WHERE email LIKE '%@example.com';
```

Step 2 - Run EXPLAIN to see why:

```sql
EXPLAIN SELECT * FROM users WHERE email LIKE '%@example.com'\G
-- type: ALL (full table scan!)
-- rows: 2000000
```

Step 3 - Add an appropriate index:

```sql
-- LIKE with leading wildcard cannot use a B-tree index
-- Use FULLTEXT or a generated column approach instead
ALTER TABLE users ADD FULLTEXT INDEX ft_email (email);

-- Or use an exact suffix with reverse trick
ALTER TABLE users ADD COLUMN email_rev VARCHAR(255)
  AS (REVERSE(email)) STORED;
ALTER TABLE users ADD INDEX idx_email_rev (email_rev);
```

## Logging Queries at 0 Threshold (All Queries)

For temporary deep inspection:

```sql
SET GLOBAL long_query_time = 0;
-- All queries will now be logged - use carefully
SET GLOBAL long_query_time = 1;  -- Reset afterward
```

## Summary

The MySQL slow query log is a production-safe performance monitoring tool that captures queries exceeding a time threshold. Combined with tools like `mysqldumpslow` and `pt-query-digest`, it helps teams identify the highest-impact queries to optimize. Setting `long_query_time` between 0.5 and 2 seconds is a common starting point for most applications.

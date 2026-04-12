# How to Enable and Configure the MySQL Slow Query Log

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Slow Query Log, Performance Tuning, Monitoring

Description: Learn how to enable the MySQL slow query log, configure thresholds and options, and analyze slow queries to identify performance bottlenecks.

---

## What Is the Slow Query Log

The MySQL slow query log records queries that take longer than a specified threshold (`long_query_time`). It is the primary tool for identifying performance bottlenecks and queries that need optimization.

## Checking Current Status

```sql
SHOW VARIABLES LIKE 'slow_query_log%';
SHOW VARIABLES LIKE 'long_query_time';
```

```text
+---------------------+---------------------------+
| Variable_name       | Value                     |
+---------------------+---------------------------+
| slow_query_log      | OFF                       |
| slow_query_log_file | /var/lib/mysql/slow.log   |
+---------------------+---------------------------+

+-----------------+-------+
| Variable_name   | Value |
+-----------------+-------+
| long_query_time | 10    |
+-----------------+-------+
```

## Enabling the Slow Query Log Dynamically

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;   -- Log queries taking > 1 second
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

These settings take effect immediately but reset on restart.

## Persistent Configuration in my.cnf

```ini
[mysqld]
slow_query_log       = 1
slow_query_log_file  = /var/log/mysql/slow.log
long_query_time      = 1
log_queries_not_using_indexes = ON
min_examined_row_limit = 100
```

- `long_query_time` - threshold in seconds (fractions allowed: `0.5`)
- `log_queries_not_using_indexes` - log queries that don't use indexes even if fast
- `min_examined_row_limit` - only log queries that examine at least N rows

## Log File Format

A sample slow query log entry:

```text
# Time: 2026-03-31T10:15:32.123456Z
# User@Host: appuser[appuser] @ localhost []  Id: 1234
# Query_time: 3.456789  Lock_time: 0.000123 Rows_sent: 1  Rows_examined: 485320
SET timestamp=1743416132;
SELECT * FROM orders WHERE customer_name LIKE '%Smith%';
```

Key fields:
- `Query_time` - total execution time
- `Lock_time` - time waiting for locks
- `Rows_sent` - rows returned to the client
- `Rows_examined` - rows scanned (high ratio to `Rows_sent` suggests missing index)

## Analyzing with mysqldumpslow

MySQL includes `mysqldumpslow` for summarizing the log:

```bash
# Top 10 by total time
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log

# Top 10 by average time
mysqldumpslow -s at -t 10 /var/log/mysql/slow.log

# Queries with full details
mysqldumpslow -s t -t 5 -a /var/log/mysql/slow.log
```

Output example:

```text
Count: 142  Time=3.45s (490s)  Lock=0.00s (0s)  Rows=1.0 (142), appuser@%
  SELECT * FROM orders WHERE customer_name LIKE 'S'
```

## Analyzing with pt-query-digest (Percona Toolkit)

For more detailed analysis:

```bash
pt-query-digest /var/log/mysql/slow.log | head -100
```

Output includes query fingerprints, call counts, average and total execution times, and index usage hints.

## Rotating the Slow Query Log

```bash
# Rotate the file
mv /var/log/mysql/slow.log /var/log/mysql/slow.log.old

# Tell MySQL to open a new log file
mysql -u root -p -e "FLUSH SLOW LOGS;"
```

## Summary

Enable the MySQL slow query log with `SET GLOBAL slow_query_log = ON` and `SET GLOBAL long_query_time = 1`. Also enable `log_queries_not_using_indexes` to catch index-less queries. Analyze the log using `mysqldumpslow` or `pt-query-digest` to identify the most impactful queries to optimize.

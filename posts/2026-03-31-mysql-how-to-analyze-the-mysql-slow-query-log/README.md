# How to Analyze the MySQL Slow Query Log

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Slow Query Log, Performance Analysis, Query Optimization

Description: Learn how to read and analyze the MySQL slow query log to identify the most expensive queries and reduce database latency.

---

## Why Analyze the Slow Query Log

After enabling the MySQL slow query log, the next step is to interpret what it contains. Raw slow query log files can grow large and contain thousands of entries. Analyzing them helps you find the queries causing the most damage to performance, understand their execution patterns, and prioritize optimization work.

## Reading the Raw Log File

Each entry in the slow query log contains header lines starting with `#` followed by the SQL statement. A typical entry looks like:

```text
# Time: 2026-03-31T10:00:00.000000Z
# User@Host: webapp[webapp] @ localhost []  Id: 101
# Query_time: 3.215000  Lock_time: 0.001200  Rows_sent: 5  Rows_examined: 820000
SET timestamp=1774951200;
SELECT * FROM products WHERE category_id = 7 AND active = 1;
```

Key fields to focus on:
- `Query_time` - total execution time in seconds
- `Lock_time` - time spent waiting for locks
- `Rows_examined` - how many rows MySQL scanned
- `Rows_sent` - how many rows were returned

A high ratio of `Rows_examined` to `Rows_sent` is a clear sign that the query needs a better index.

## Using mysqldumpslow

MySQL ships with `mysqldumpslow`, a command-line utility that aggregates and summarizes slow query log entries. It groups similar queries together and reports aggregate statistics.

Sort by total time spent:

```bash
mysqldumpslow -s t /var/log/mysql/slow.log
```

Sort by count (most frequent queries):

```bash
mysqldumpslow -s c /var/log/mysql/slow.log
```

Show the top 10 queries by average time:

```bash
mysqldumpslow -s at -t 10 /var/log/mysql/slow.log
```

Sample output:

```text
Count: 1453  Time=4.21s (6121s)  Lock=0.00s (3s)  Rows=1.0 (1453), webapp[webapp]@localhost
  SELECT * FROM orders WHERE user_id = N
```

The `N` represents a normalized numeric value. This tells you the query ran 1453 times, totaling 6121 seconds of execution time.

## Querying the Slow Log Table

If `log_output` includes `TABLE`, you can query slow log data with SQL:

```sql
SELECT
  sql_text,
  query_time,
  rows_examined,
  rows_sent,
  start_time
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 20;
```

Find the most expensive query by total time across multiple executions:

```sql
SELECT
  sql_text,
  COUNT(*) AS exec_count,
  SUM(query_time) AS total_time,
  AVG(query_time) AS avg_time,
  MAX(query_time) AS max_time
FROM mysql.slow_log
GROUP BY sql_text
ORDER BY total_time DESC
LIMIT 10;
```

## Using EXPLAIN on Slow Queries

Once you identify a slow query, run EXPLAIN to understand its execution plan:

```sql
EXPLAIN SELECT * FROM products WHERE category_id = 7 AND active = 1;
```

Look at the `type` column for full table scans (`ALL`), which indicate missing indexes. Also check `rows` for an estimate of how many rows MySQL expects to examine.

```sql
EXPLAIN FORMAT=JSON
SELECT * FROM products WHERE category_id = 7 AND active = 1\G
```

The JSON format provides deeper detail including cost estimates.

## Interpreting Common Patterns

Queries with large `Rows_examined` values relative to `Rows_sent` need better indexes. Add a composite index that covers all the WHERE clause columns:

```sql
ALTER TABLE products ADD INDEX idx_category_active (category_id, active);
```

Queries with high `Lock_time` may indicate lock contention. Use `SHOW ENGINE INNODB STATUS` to investigate lock waits:

```sql
SHOW ENGINE INNODB STATUS\G
```

## Flushing and Rotating the Log

Over time, the slow query log grows large. Rotate it periodically:

```bash
mv /var/log/mysql/slow.log /var/log/mysql/slow.log.old
mysqladmin flush-logs
```

Or use `logrotate` to automate rotation on a schedule.

## Summary

The MySQL slow query log captures queries that exceed your performance threshold. By using `mysqldumpslow` to aggregate entries, querying the `mysql.slow_log` table with SQL, and running EXPLAIN on identified queries, you can systematically find and fix the most harmful queries. Focus on queries with the highest total execution time and the worst rows-examined to rows-sent ratio.

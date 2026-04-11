# How to Use mysqldumpslow for Slow Query Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Slow Query

Description: Learn how to use mysqldumpslow to parse and summarize MySQL slow query logs, identify the worst-performing queries, and prioritize optimization efforts.

---

`mysqldumpslow` is a command-line tool bundled with MySQL that parses the slow query log and groups similar queries together, aggregating their execution statistics. It is the quickest way to identify which queries are causing the most performance problems in a MySQL instance.

## Enabling the Slow Query Log

Before using `mysqldumpslow`, the slow query log must be enabled:

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 1;  -- Log queries taking more than 1 second
SET GLOBAL log_queries_not_using_indexes = ON;
```

Or set these permanently in `my.cnf`:

```ini
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = 1
```

## Basic Usage

Run `mysqldumpslow` against the slow query log file:

```bash
mysqldumpslow /var/log/mysql/slow.log
```

Output groups similar queries (with literal values abstracted to `N` and `S`) and shows:
- Count of times the query ran
- Average and total execution time
- Average and total rows sent

## Sorting Options

Sort by different metrics to prioritize what to optimize:

```bash
# Sort by total query time
mysqldumpslow -s t /var/log/mysql/slow.log

# Sort by average query time (default)
mysqldumpslow -s at /var/log/mysql/slow.log

# Sort by total rows sent (high rows sent often means missing index)
mysqldumpslow -s r /var/log/mysql/slow.log

# Sort by call count (high count = good optimization target)
mysqldumpslow -s c /var/log/mysql/slow.log
```

## Limiting Output

Show only the top N queries:

```bash
# Top 10 queries by total execution time
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log
```

## Filtering by Query Pattern

Use `-g` to filter queries matching a pattern:

```bash
# Show only SELECT queries
mysqldumpslow -g "^SELECT" /var/log/mysql/slow.log

# Show queries involving the orders table
mysqldumpslow -g "orders" /var/log/mysql/slow.log
```

## Sample Output

```text
Reading mysql slow query log from /var/log/mysql/slow.log

Count: 142  Time=3.21s (456s)  Lock=0.00s (0s)  Rows=1234.5 (175299), app@localhost
  SELECT * FROM orders WHERE customer_id=N AND status=S ORDER BY created_at DESC LIMIT N

Count: 67   Time=1.85s (124s)  Lock=0.00s (0s)  Rows=8920.3 (597661), app@localhost
  SELECT COUNT(*) FROM order_items WHERE order_id=N
```

The first query ran 142 times with a total execution time of 456 seconds. `N` and `S` replace numeric and string literals.

## Interpreting Results

High `Rows` with low `Count` suggests queries returning large result sets that may benefit from adding `LIMIT` clauses or narrower filters. High `Count` with moderate `Time` suggests frequently run queries that add up to significant load. Queries with high `Rows` sent are strong candidates for index optimization.

Check the query plan with `EXPLAIN`:

```sql
EXPLAIN SELECT * FROM orders
WHERE customer_id = 100 AND status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
```

## Rotating Slow Query Logs

Flush the slow query log after analysis to start fresh:

```bash
# Rename current log, then flush so MySQL reopens a new file
mv /var/log/mysql/slow.log /var/log/mysql/slow.log.$(date +%F)
mysqladmin -u root -p flush-logs
```

## Summary

`mysqldumpslow` parses MySQL slow query logs and groups similar queries to surface the worst performers. Sort by total time to find the biggest bottlenecks, sort by rows sent to find queries returning excessive data, and use the output to prioritize index creation and query rewrites.

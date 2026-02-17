# How to Enable and Analyze Slow Query Logs in Cloud SQL MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, MySQL, Slow Query Log, Performance

Description: Learn how to enable, configure, and analyze slow query logs in Cloud SQL for MySQL to identify and fix performance bottlenecks in your database.

---

Every MySQL database has queries that run slower than they should. The challenge is finding them. MySQL's slow query log captures queries that exceed a time threshold, giving you a clear list of what needs optimization. On Cloud SQL, enabling and analyzing these logs is straightforward, and the insights can save you from performance problems before your users notice them.

## Enabling the Slow Query Log

Cloud SQL lets you configure MySQL database flags through the console or gcloud CLI. The slow query log is controlled by a few key flags:

```bash
# Enable the slow query log and set the threshold to 1 second
# Queries taking longer than 1 second will be logged
gcloud sql instances patch my-mysql-instance \
  --database-flags \
  slow_query_log=on,\
  long_query_time=1,\
  log_output=FILE
```

The flags explained:

- **slow_query_log**: Turns the logging on or off
- **long_query_time**: Threshold in seconds. Queries taking longer than this are logged. Default is 10 seconds, which is too high for most applications. Start with 1 second and lower it as you optimize.
- **log_output**: Set to FILE to write to the MySQL slow query log file, which integrates with Cloud Logging

You can set a fractional threshold for sub-second detection:

```bash
# Capture queries slower than 500 milliseconds
gcloud sql instances patch my-mysql-instance \
  --database-flags \
  slow_query_log=on,\
  long_query_time=0.5,\
  log_output=FILE
```

## Additional Useful Flags

There are several more flags worth enabling for comprehensive slow query analysis:

```bash
# Enable additional slow query logging options
gcloud sql instances patch my-mysql-instance \
  --database-flags \
  slow_query_log=on,\
  long_query_time=1,\
  log_output=FILE,\
  log_queries_not_using_indexes=on,\
  log_slow_admin_statements=on
```

- **log_queries_not_using_indexes**: Logs queries that do not use an index, even if they are fast. These are ticking time bombs - fast now but will slow down as the table grows.
- **log_slow_admin_statements**: Logs slow administrative statements like ALTER TABLE and OPTIMIZE TABLE.

## Viewing Slow Query Logs in Cloud Logging

Cloud SQL automatically sends slow query logs to Cloud Logging. You can view them in the GCP Console or query them with gcloud:

```bash
# View recent slow query log entries
gcloud logging read \
  'resource.type="cloudsql_database" AND resource.labels.database_id="my-project:my-mysql-instance" AND logName="projects/my-project/logs/cloudsql.googleapis.com%2Fmysql-slow.log"' \
  --limit=50 \
  --format='table(timestamp, textPayload)'
```

For more detailed exploration:

```bash
# Search for specific slow queries containing a table name
gcloud logging read \
  'resource.type="cloudsql_database" AND resource.labels.database_id="my-project:my-mysql-instance" AND logName:"mysql-slow.log" AND textPayload:"orders"' \
  --limit=20
```

## Understanding Slow Query Log Entries

A typical slow query log entry looks like this:

```
# Time: 2025-06-15T10:23:45.123456Z
# User@Host: appuser[appuser] @ [10.0.0.5]
# Query_time: 3.456789  Lock_time: 0.000123  Rows_sent: 42  Rows_examined: 1500000
SET timestamp=1718443425;
SELECT o.order_id, c.name, o.total
FROM orders o JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date BETWEEN '2025-01-01' AND '2025-06-30'
ORDER BY o.total DESC;
```

The key fields:

- **Query_time**: How long the query took (3.46 seconds)
- **Lock_time**: Time spent waiting for locks (0.12ms - negligible)
- **Rows_sent**: Rows returned to the client (42)
- **Rows_examined**: Rows the query had to look at (1.5 million)

The ratio of Rows_examined to Rows_sent is telling. This query examined 1.5 million rows to return 42 - a ratio of about 35,000:1. That screams "missing index."

## Analyzing with mysqldumpslow

Cloud SQL does not give you direct shell access, but you can export the slow query logs and analyze them locally:

```bash
# Export slow query logs to a file
gcloud logging read \
  'resource.type="cloudsql_database" AND logName:"mysql-slow.log"' \
  --limit=10000 \
  --format='value(textPayload)' > slow_queries.log
```

If you have the MySQL client tools installed, mysqldumpslow can summarize the log:

```bash
# Summarize slow queries sorted by total time
mysqldumpslow -s t slow_queries.log

# Top 10 queries by count (most frequent slow queries)
mysqldumpslow -s c -t 10 slow_queries.log

# Top 10 by average time
mysqldumpslow -s at -t 10 slow_queries.log
```

## Analyzing with pt-query-digest

For more sophisticated analysis, Percona's pt-query-digest is the gold standard:

```bash
# Install Percona toolkit
sudo apt-get install percona-toolkit

# Analyze slow query log with pt-query-digest
pt-query-digest slow_queries.log > analysis_report.txt
```

pt-query-digest produces a detailed report that groups similar queries, shows execution statistics, and provides optimization suggestions. Here is what a typical entry looks like:

```
# Query 1: 45.23% of total time, 234 occurrences
# Median query time: 2.34s
# Rows examined: avg 1,234,567
SELECT o.order_id, c.name, o.total
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date BETWEEN 'S' AND 'S'
ORDER BY o.total DESC\G
```

## Using Performance Schema for Real-Time Analysis

While slow query logs capture historical data, the Performance Schema gives you real-time insights:

```sql
-- Find the top 10 queries by total execution time
-- This works on Cloud SQL MySQL without needing the slow query log
SELECT
  DIGEST_TEXT AS query_pattern,
  COUNT_STAR AS execution_count,
  ROUND(SUM_TIMER_WAIT / 1000000000000, 2) AS total_time_sec,
  ROUND(AVG_TIMER_WAIT / 1000000000, 2) AS avg_time_ms,
  SUM_ROWS_EXAMINED AS total_rows_examined,
  SUM_ROWS_SENT AS total_rows_sent
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = 'myapp'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

## Finding Missing Indexes

Use the slow query data to identify missing indexes:

```sql
-- Find tables with the most full table scans
SELECT
  object_schema,
  object_name,
  count_read AS total_reads,
  count_fetch AS rows_fetched
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NULL  -- NULL means no index was used
  AND object_schema = 'myapp'
ORDER BY count_read DESC
LIMIT 20;
```

Then for a specific slow query, use EXPLAIN to confirm the missing index:

```sql
-- Investigate a specific slow query
EXPLAIN
SELECT o.order_id, c.name, o.total
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date BETWEEN '2025-01-01' AND '2025-06-30'
ORDER BY o.total DESC;
```

If EXPLAIN shows "type: ALL" (full table scan), add an appropriate index:

```sql
-- Add a composite index for the common query pattern
-- Covers the WHERE clause and helps with ORDER BY
CREATE INDEX idx_orders_date_total ON orders(order_date, total DESC);
```

## Setting Up Alerts

Create alerts when slow queries spike, which might indicate a performance regression:

```bash
# Create a log-based metric for slow queries
gcloud logging metrics create slow_query_count \
  --description="Count of slow queries" \
  --log-filter='resource.type="cloudsql_database" AND logName:"mysql-slow.log"'

# Create an alert when slow queries exceed a threshold
gcloud monitoring policies create \
  --display-name="High Slow Query Rate" \
  --condition-display-name="Slow queries per minute" \
  --condition-filter='metric.type="logging.googleapis.com/user/slow_query_count"' \
  --condition-threshold-value=50 \
  --condition-threshold-duration=300s \
  --notification-channels="projects/my-project/notificationChannels/123"
```

## Optimization Workflow

Here is the workflow I follow:

1. Enable slow query logging with a 1-second threshold
2. Let it run for at least a week to capture different traffic patterns
3. Export and analyze with pt-query-digest
4. Focus on the top 5 queries by total time (not average time - a query that runs 10,000 times at 200ms is worse than one that runs once at 5 seconds)
5. Use EXPLAIN on each one to understand why it is slow
6. Add indexes, rewrite queries, or adjust configuration
7. Monitor the slow query log to verify improvements
8. Gradually lower the threshold to catch more queries

The slow query log is your early warning system. Enable it, analyze it regularly, and act on what it tells you. Your Cloud SQL MySQL instance will run better, and your users will notice the difference.

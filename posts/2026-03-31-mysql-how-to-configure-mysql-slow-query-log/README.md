# How to Configure MySQL Slow Query Log

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Slow Query Log, Performance Tuning, Database Monitoring

Description: Learn how to enable and configure the MySQL slow query log to identify and fix queries that degrade application performance.

---

## What Is the MySQL Slow Query Log

The MySQL slow query log records all SQL statements that take longer than a specified threshold to execute. It is one of the most effective tools for diagnosing performance bottlenecks in a MySQL database. When enabled, MySQL writes qualifying queries to a log file along with execution time, lock time, and rows examined.

## Enabling the Slow Query Log

You can enable the slow query log at runtime without restarting MySQL:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL long_query_time = 1;
```

To make the setting permanent, add the following lines to your `my.cnf` or `my.ini` configuration file:

```ini
[mysqld]
slow_query_log = ON
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
```

Restart MySQL after editing the configuration file:

```bash
sudo systemctl restart mysql
```

## Setting the Long Query Time Threshold

The `long_query_time` variable controls how many seconds a query must take before it is logged. The default value is 10 seconds, which is often too high to catch most problem queries. A value of 1 or 2 seconds is more practical for production systems.

```sql
SET GLOBAL long_query_time = 0.5;
```

You can set it to a fractional value such as 0.5 to capture queries taking more than 500 milliseconds.

## Logging Queries Without Indexes

MySQL can also log queries that do not use an index, even if they run quickly. This is useful for catching full table scans early.

```sql
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

To avoid flooding the log with the same index-missing query repeated many times, set a throttle:

```sql
SET GLOBAL log_throttle_queries_not_using_indexes = 10;
```

This limits index-missing queries to 10 per minute in the log.

## Checking Current Configuration

Verify your slow query log settings at any time:

```sql
SHOW VARIABLES LIKE 'slow_query_log%';
SHOW VARIABLES LIKE 'long_query_time';
SHOW VARIABLES LIKE 'log_queries_not_using_indexes';
```

Sample output:

```text
+---------------------+----------------------------------+
| Variable_name       | Value                            |
+---------------------+----------------------------------+
| slow_query_log      | ON                               |
| slow_query_log_file | /var/log/mysql/slow.log          |
+---------------------+----------------------------------+
```

## Viewing the Slow Query Log

Once enabled, you can view entries in the slow query log directly:

```bash
sudo tail -f /var/log/mysql/slow.log
```

A typical slow query log entry looks like this:

```text
# Time: 2026-03-31T12:00:00.000000Z
# User@Host: app[app] @ localhost []  Id: 42
# Query_time: 2.345678  Lock_time: 0.000123  Rows_sent: 1  Rows_examined: 500000
SET timestamp=1774958400;
SELECT * FROM orders WHERE status = 'pending';
```

The entry shows the user, execution time, lock time, and rows examined vs rows sent. A large gap between rows examined and rows sent usually indicates a missing or unused index.

## Configuring Log Output Destination

MySQL can write slow query data to a file, a table, or both:

```sql
SET GLOBAL log_output = 'FILE,TABLE';
```

When `TABLE` is selected, slow queries also appear in the `mysql.slow_log` table:

```sql
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
```

Writing to a table makes it easier to query and filter slow log data using SQL.

## Summary

The MySQL slow query log is a built-in diagnostic tool that captures queries exceeding a configurable execution time threshold. By setting `slow_query_log = ON`, adjusting `long_query_time`, and enabling `log_queries_not_using_indexes`, you gain clear visibility into queries that harm performance. Reviewing the log regularly - or using tools like pt-query-digest - helps you prioritize indexing and query optimization efforts.

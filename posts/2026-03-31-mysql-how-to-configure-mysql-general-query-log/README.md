# How to Configure MySQL General Query Log

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, General Query Log, Logging, Configuration, Debugging

Description: Learn how to enable, configure, and use the MySQL general query log to capture all connections and SQL statements for debugging and auditing purposes.

---

## What Is the MySQL General Query Log

The general query log records every connection attempt and every SQL statement received by the MySQL server - in chronological order, before execution. Unlike the slow query log which only captures slow queries, the general query log captures everything.

This makes it valuable for debugging application queries and short-term auditing, but too high-overhead for permanent production use.

## Enable the General Query Log

Check if it is currently enabled:

```sql
SHOW VARIABLES LIKE 'general_log%';
```

```text
+------------------+----------------------------------+
| Variable_name    | Value                            |
+------------------+----------------------------------+
| general_log      | OFF                              |
| general_log_file | /var/lib/mysql/hostname-gen.log  |
+------------------+----------------------------------+
```

Enable dynamically (no restart required):

```sql
SET GLOBAL general_log = ON;
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
```

Or in `/etc/mysql/mysql.conf.d/mysqld.cnf` for persistent configuration:

```text
[mysqld]
general_log = 1
general_log_file = /var/log/mysql/general.log
```

## Log to a Table Instead of a File

MySQL can write the general query log to the `mysql.general_log` table, making queries against the log easy:

```sql
-- Switch output to table
SET GLOBAL log_output = 'TABLE';
SET GLOBAL general_log = ON;

-- Query the log
SELECT event_time, user_host, command_type, argument
FROM mysql.general_log
ORDER BY event_time DESC
LIMIT 20;
```

Or log to both file and table:

```sql
SET GLOBAL log_output = 'FILE,TABLE';
```

## Read the General Query Log

```bash
# Watch the log in real time
tail -f /var/log/mysql/general.log

# Filter for queries from a specific user
grep "appuser" /var/log/mysql/general.log

# Show only SELECT queries
grep " Query" /var/log/mysql/general.log | grep -i "^.*SELECT"
```

Sample log output:

```text
2026-03-31T10:00:01.000000Z       42 Connect   appuser@10.0.0.5 on appdb using TCP/IP
2026-03-31T10:00:01.001234Z       42 Query     SELECT id, name FROM users WHERE id = 1001
2026-03-31T10:00:01.002345Z       42 Query     UPDATE orders SET status = 'shipped' WHERE id = 55
2026-03-31T10:00:01.003456Z       42 Quit
```

## Enable Temporarily for Debugging

The general log is high-overhead (every query is written to disk). Enable it only for debugging sessions:

```bash
# Enable
mysql -u root -p -e "SET GLOBAL general_log = ON;"

# Reproduce the issue or capture traffic
sleep 60

# Disable
mysql -u root -p -e "SET GLOBAL general_log = OFF;"

# Analyze
grep "specific_table" /var/log/mysql/general.log
```

## Log Only Specific Users

MySQL does not natively support per-user filtering of the general query log. The general log is a global setting that captures all queries from all users. To filter by user, you have two main options:

**Option 1**: Enable the general log globally and filter the output after the fact using `grep` or SQL queries on the `mysql.general_log` table:

```sql
SELECT event_time, user_host, command_type, argument
FROM mysql.general_log
WHERE user_host LIKE '%appuser%'
ORDER BY event_time DESC;
```

**Option 2**: Use the MySQL Enterprise Audit plugin (or a third-party audit plugin) which supports per-user filtering natively.

Alternatively, capture all queries with `long_query_time = 0` to log everything to the slow log:

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 0;   -- Log ALL queries as slow
```

This logs every query to the slow query log with timing information - often more useful than the general log for performance analysis.

## Disable General Log for Production

```sql
SET GLOBAL general_log = OFF;
```

Or ensure it is off in `my.cnf`:

```text
[mysqld]
general_log = 0
```

## Purge the Log Table

```sql
-- Truncate the log table when done
TRUNCATE TABLE mysql.general_log;
```

## Performance Impact

The general query log has measurable overhead - typically 5-15% throughput reduction at high QPS. Always disable it after debugging. If you need production query logging for compliance, use the audit plugin which has lower overhead and more selective filtering.

## Summary

The MySQL general query log captures all connections and queries in chronological order, making it ideal for short-term debugging and reproducing application behavior. Enable it dynamically without a restart, use the `TABLE` output format for easy querying, and always disable it when the debugging session is complete. For production auditing, use the audit plugin instead for better performance and more control over what gets logged.

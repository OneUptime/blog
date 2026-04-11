# What Is the General Query Log in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, General Query Log, Logging, Debugging

Description: The MySQL general query log records every SQL statement the server receives, making it useful for debugging and auditing application query activity.

---

## Overview

The general query log is a MySQL log that records every connection, disconnection, and query received by the server - regardless of whether the query succeeded or failed. Unlike the binary log, it captures all query types including SELECT, INSERT, UPDATE, DELETE, and even administrative commands.

Because it logs everything, the general query log can grow very quickly and may impact performance, so it is typically disabled in production and enabled only temporarily for debugging.

## Checking Current Status

```sql
SHOW VARIABLES LIKE 'general_log';
SHOW VARIABLES LIKE 'general_log_file';
```

## Enabling the General Query Log

### At Runtime (No Restart Needed)

```sql
-- Enable general query logging
SET GLOBAL general_log = 'ON';

-- Set the log output destination
SET GLOBAL log_output = 'FILE';  -- or 'TABLE' or 'FILE,TABLE'

-- Optionally set a custom file path
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
```

### In Configuration File

```text
[mysqld]
general_log = 1
general_log_file = /var/log/mysql/general.log
log_output = FILE
```

## Log Output Destinations

MySQL supports two destinations for the general query log:

```sql
-- Log to file
SET GLOBAL log_output = 'FILE';

-- Log to mysql.general_log table
SET GLOBAL log_output = 'TABLE';

-- Log to both
SET GLOBAL log_output = 'FILE,TABLE';
```

### Querying the Table-Based Log

```sql
-- View recent queries from the log table
SELECT event_time, user_host, command_type, argument
FROM mysql.general_log
ORDER BY event_time DESC
LIMIT 20;

-- Filter by a specific user
SELECT * FROM mysql.general_log
WHERE user_host LIKE '%app_user%'
ORDER BY event_time DESC;
```

## Example Log File Output

```text
2026-03-31T10:00:01.123456Z    8 Connect   root@localhost on mydb using TCP/IP
2026-03-31T10:00:01.124000Z    8 Query     SELECT * FROM users WHERE id = 1
2026-03-31T10:00:01.126000Z    8 Query     UPDATE orders SET status='shipped' WHERE id = 42
2026-03-31T10:00:02.000000Z    8 Quit
```

## Filtering Queries for a Specific Database

The general log does not natively filter by database, but you can grep the log file:

```bash
grep "USE mydb" /var/log/mysql/general.log
grep "SELECT.*users" /var/log/mysql/general.log
```

## Performance Considerations

The general query log impacts server performance because every query is written to disk synchronously. Benchmarks show 5-15% throughput reduction even on fast storage.

Best practices:
- Enable only during debugging or troubleshooting sessions
- Use the slow query log instead for ongoing monitoring
- Consider `log_output = TABLE` for easier querying, but rotate it regularly

## Disabling the General Query Log

```sql
SET GLOBAL general_log = 'OFF';
```

## Rotating the Log File

```bash
# Rename the current log file, then flush to create a new one
mv /var/log/mysql/general.log /var/log/mysql/general.log.old
mysqladmin -u root -p flush-logs

# Or execute the flush within MySQL after renaming the file
FLUSH LOGS;
```

## Summary

The MySQL general query log provides complete visibility into all SQL traffic hitting a server, making it invaluable for debugging application behavior, auditing access, or troubleshooting unexpected query patterns. Due to its performance overhead, it should be used sparingly in production - enable it temporarily, investigate the issue, then disable it. The slow query log is a better long-term monitoring alternative.

# How to Configure the MySQL General Query Log

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, General Query Log, Logging, Configuration, Diagnostic

Description: Learn how to enable, configure, and manage the MySQL general query log to capture every SQL statement executed by the server for debugging and auditing.

---

The MySQL general query log records every connection, disconnection, and SQL statement received by the server. It is invaluable for debugging application behavior, auditing queries, or understanding exactly what a client is sending. Because it logs everything, enabling it on a busy production server should be done carefully and only for short periods.

## Checking Whether the General Query Log Is Enabled

```sql
SHOW VARIABLES LIKE 'general_log';
SHOW VARIABLES LIKE 'general_log_file';
```

By default, the general query log is disabled. The log file defaults to `<hostname>.log` inside the data directory.

## Enabling the General Query Log at Runtime

You can enable the log without restarting MySQL:

```sql
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
```

Disable it just as easily when you are done:

```sql
SET GLOBAL general_log = 'OFF';
```

## Enabling the General Query Log in my.cnf

To enable it persistently, add these lines to the `[mysqld]` section:

```ini
[mysqld]
general_log = ON
general_log_file = /var/log/mysql/general.log
```

Restart MySQL after editing the configuration file:

```bash
sudo systemctl restart mysql
```

## Logging to a Table Instead of a File

MySQL can write the general query log to a table in the `mysql` schema instead of a flat file:

```sql
SET GLOBAL log_output = 'TABLE';
SET GLOBAL general_log = 'ON';
```

Query the log entries using standard SQL:

```sql
SELECT event_time, user_host, command_type, argument
FROM mysql.general_log
ORDER BY event_time DESC
LIMIT 50;
```

You can log to both file and table simultaneously:

```sql
SET GLOBAL log_output = 'FILE,TABLE';
```

## Suppressing Logging for a Specific Session

When the general query log is enabled globally, you can suppress logging for individual sessions that you do not need to capture:

```sql
SET SESSION sql_log_off = ON;
```

This is useful when the general log is active for debugging but certain connections (such as monitoring or health-check queries) are generating noise. By default `sql_log_off` is `OFF`, meaning all sessions are logged when the general log is on. Setting it to `ON` for a session prevents that session's statements from being recorded.

Note: `sql_log_off` only suppresses logging for a session when the global general log is already enabled. It cannot enable per-session logging when `general_log` is `OFF`.

## Truncating the Log Table

When logging to the `mysql.general_log` table, truncate it periodically to reclaim space:

```sql
SET GLOBAL general_log = 'OFF';
TRUNCATE TABLE mysql.general_log;
SET GLOBAL general_log = 'ON';
```

You must disable the log before truncating; otherwise MySQL returns an error.

## Performance Considerations

The general query log adds overhead to every query because MySQL must write each statement to disk or a table before returning results. On a server handling thousands of queries per second, this overhead becomes significant. Best practices include:

- Enable it only during active debugging sessions
- Use the table output format if you need to filter and search the log
- Consider using the slow query log for performance diagnostics instead, as it captures only queries exceeding a defined threshold

## Summary

The MySQL general query log provides complete visibility into every statement executed on the server. Enable it at runtime with `SET GLOBAL general_log = 'ON'` for short-term debugging, and persist the setting in `my.cnf` only if required for auditing. Use `log_output = 'TABLE'` for queryable structured output, and always disable it when not actively needed to avoid unnecessary overhead.

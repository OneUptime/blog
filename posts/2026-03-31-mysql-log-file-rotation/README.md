# How to Manage MySQL Log File Rotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Log, Rotation, Administration, Binary Log

Description: Learn how to manage MySQL log file rotation for general, error, slow query, and binary logs to prevent disk exhaustion and maintain log hygiene.

---

## MySQL Log Types

MySQL generates several types of log files, each requiring different rotation strategies:

- **Error log** - MySQL startup, shutdown, and error messages
- **General query log** - every query received (high volume, usually disabled)
- **Slow query log** - queries exceeding `long_query_time`
- **Binary log** - DML/DDL changes for replication and point-in-time recovery

Without rotation, these logs grow indefinitely and can fill the disk, causing MySQL to stop accepting writes.

## Rotating the Error and Slow Query Logs

MySQL supports live log rotation via `FLUSH LOGS` or `FLUSH ERROR LOGS`. Use logrotate for automated rotation:

Create `/etc/logrotate.d/mysql`:

```text
/var/log/mysql/error.log /var/log/mysql/slow.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 mysql adm
    postrotate
        if test -x /usr/bin/mysqladmin && \
           /usr/bin/mysqladmin --defaults-file=/etc/mysql/debian.cnf ping &>/dev/null
        then
            /usr/bin/mysqladmin --defaults-file=/etc/mysql/debian.cnf flush-logs
        fi
    endscript
}
```

The `postrotate` script runs `mysqladmin flush-logs` to tell MySQL to open new log files after logrotate has renamed the old ones.

Test the configuration:

```bash
logrotate --debug /etc/logrotate.d/mysql
```

## Managing Binary Log Rotation

Binary logs rotate automatically when they reach `max_binlog_size`:

```ini
[mysqld]
max_binlog_size = 512M
expire_logs_days = 7
```

In MySQL 8.0+, use `binlog_expire_logs_seconds` instead:

```ini
binlog_expire_logs_seconds = 604800  # 7 days in seconds
```

Manually trigger a new binary log file:

```sql
FLUSH BINARY LOGS;
```

List current binary log files and their sizes:

```sql
SHOW BINARY LOGS;
```

Manually purge old binary logs up to a specific file:

```sql
PURGE BINARY LOGS TO 'mysql-bin.000050';
```

Or purge by date:

```sql
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);
```

## Monitoring Binary Log Disk Usage

Check how much disk space binary logs consume:

```bash
du -sh /var/lib/mysql/mysql-bin.*
```

Or query from MySQL using `SHOW BINARY LOGS`, which returns file names and sizes directly:

```sql
SHOW BINARY LOGS;
```

## Handling the General Query Log

The general query log generates enormous volume on busy servers. Keep it disabled in production:

```sql
SHOW VARIABLES LIKE 'general_log';
SET GLOBAL general_log = OFF;
```

Enable it temporarily for debugging and rotate manually:

```sql
SET GLOBAL general_log = OFF;
-- logrotate or manually rename the file here
SET GLOBAL general_log_file = '/var/log/mysql/general-new.log';
SET GLOBAL general_log = ON;
```

## Automating Binary Log Cleanup

Create a MySQL Event to purge old binary logs nightly:

```sql
SET GLOBAL event_scheduler = ON;

CREATE EVENT purge_old_binary_logs
ON SCHEDULE EVERY 1 DAY
STARTS '2026-04-01 03:00:00'
DO
  PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);
```

Never purge binary logs that have not been replicated to all replicas. Check replica positions first:

```sql
SHOW REPLICA STATUS\G
-- Note the Source_Log_File value and only purge logs older than that
```

## Summary

Manage MySQL log rotation by configuring logrotate with `flush-logs` for error and slow query logs, setting `binlog_expire_logs_seconds` for automatic binary log expiry, and creating a MySQL Event for nightly purges. Always verify replica log positions before purging binary logs to avoid breaking replication.

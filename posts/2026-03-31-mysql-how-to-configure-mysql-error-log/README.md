# How to Configure MySQL Error Log

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error Log, Logging, Configuration, Troubleshooting

Description: Learn how to configure the MySQL error log location, verbosity, format, and rotation, and how to interpret common error log messages.

---

## What Is the MySQL Error Log

The MySQL error log records server startup and shutdown events, critical errors, warnings, and informational messages. It is the first place to look when MySQL fails to start, crashes, or behaves unexpectedly. Unlike the general query log or slow query log, the error log is always enabled.

## Default Location

The default error log location depends on the OS:

```bash
# Find the error log location
mysql -u root -p -e "SHOW VARIABLES LIKE 'log_error';"
```

```text
+---------------+--------------------------+
| Variable_name | Value                    |
+---------------+--------------------------+
| log_error     | /var/log/mysql/error.log |
+---------------+--------------------------+
```

On some systems, it defaults to `/var/lib/mysql/<hostname>.err`.

## Configure the Error Log Location

In `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
log_error = /var/log/mysql/error.log
```

```bash
# Ensure MySQL can write to the log file
touch /var/log/mysql/error.log
chown mysql:mysql /var/log/mysql/error.log
systemctl restart mysql
```

## Control Log Verbosity

The `log_error_verbosity` setting controls what gets logged:

| Value | Messages Logged |
|-------|----------------|
| 1 | Errors only |
| 2 | Errors and warnings (default) |
| 3 | Errors, warnings, and notes/info |

```text
[mysqld]
log_error_verbosity = 3
```

For production, verbosity 2 or 3 is recommended. Verbosity 1 misses important warnings.

## Use JSON Error Log Format (MySQL 8.0+)

MySQL 8.0 supports structured JSON error logging, making it easier to parse with log management tools. First, install the JSON log component:

```sql
INSTALL COMPONENT 'file://component_log_sink_json';
```

Then configure it in `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
log_error_services = log_filter_internal; log_sink_json
```

The JSON sink writes to a file based on `log_error`, with a `.NN.json` suffix appended. For example, if `log_error = /var/log/mysql/error.log`, the JSON output goes to `/var/log/mysql/error.log.00.json`.

Sample JSON output:

```json
{
  "prio": 2,
  "err_code": 3095,
  "subsystem": "",
  "source_line": 2082,
  "source_file": "sql/mysqld.cc",
  "function": "init_server_components",
  "msg": "Performance schema disabled (use --performance-schema to enable)",
  "time": "2026-03-31T10:00:01.234567Z",
  "thread": 0
}
```

## Log to syslog

To integrate with centralized logging on Linux, first install the system log component:

```sql
INSTALL COMPONENT 'file://component_log_sink_syseventlog';
```

Then configure it in `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
log_error_services = log_filter_internal; log_sink_syseventlog
```

```bash
# Verify syslog is receiving MySQL messages
journalctl -u mysql --since "5 minutes ago"
```

## Rotate the Error Log

MySQL can rotate the error log without restarting:

```sql
-- Flush the error log (creates a new log file)
FLUSH ERROR LOGS;
```

Or use `logrotate`:

```text
# /etc/logrotate.d/mysql
/var/log/mysql/error.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    postrotate
        if test -x /usr/bin/mysqladmin && \
           /usr/bin/mysqladmin ping --silent; then
          /usr/bin/mysqladmin flush-logs
        fi
    endscript
}
```

## Common Error Log Messages

### InnoDB log file creation (first start or upgrade)

```text
InnoDB: Log file ./ib_logfile0 did not exist: new to be created
InnoDB: Setting log file ./ib_logfile0 size to 48 MB
```

This is normal after a clean upgrade or first start.

### Table crash warning

```text
[ERROR] /usr/sbin/mysqld: Table './mydb/orders' is marked as crashed and should be repaired
```

Run repair:

```sql
REPAIR TABLE mydb.orders;
```

### Too many connections

```text
[ERROR] Too many connections
```

Increase `max_connections` or add connection pooling.

### InnoDB deadlock detection

```text
[Note] InnoDB: Deadlock found when trying to get lock; try restarting transaction
```

This is informational - InnoDB resolved it. Investigate deadlock patterns if frequent.

## Monitor Error Log for Alerts

```bash
# Watch for ERROR lines in real time
tail -f /var/log/mysql/error.log | grep --line-buffered "ERROR\|CRITICAL"

# Count errors in the last hour
grep "$(date +'%Y-%m-%dT%H')" /var/log/mysql/error.log | grep -c "ERROR"
```

## Summary

The MySQL error log is the primary diagnostic tool for server-level issues. Configure the log location and verbosity in `my.cnf`, use verbosity 3 for development and 2 for production, and set up logrotate to prevent disk fill. In MySQL 8.0, the JSON error log format makes it straightforward to ingest logs into Elasticsearch or Splunk for centralized monitoring and alerting.

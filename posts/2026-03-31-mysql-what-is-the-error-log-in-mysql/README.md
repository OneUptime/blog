# What Is the Error Log in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error Log, Logging, Troubleshooting

Description: The MySQL error log records server startup, shutdown, and critical runtime errors, serving as the first place to look when diagnosing MySQL problems.

---

## Overview

The MySQL error log is the most fundamental of MySQL's log files. It records:
- Server start and stop messages
- Critical errors that cause the server to abort
- Warnings about conditions that could cause problems
- Messages from the InnoDB storage engine
- Notes about configuration issues or deprecated features

It is always enabled and is the first log to check when MySQL fails to start or behaves unexpectedly.

## Finding the Error Log Location

```sql
SHOW VARIABLES LIKE 'log_error';
```

Common default locations:
- Linux: `/var/log/mysql/error.log` or `/var/log/mysqld.log`
- macOS (Homebrew): `/usr/local/var/mysql/<hostname>.err`
- Windows: `%ProgramData%\MySQL\MySQL Server 8.0\Data\<hostname>.err`

## Configuring the Error Log

```text
[mysqld]
log_error = /var/log/mysql/error.log
log_error_verbosity = 2
```

`log_error_verbosity` values:
- `1` - Errors only
- `2` - Errors and warnings (default)
- `3` - Errors, warnings, and notes/info

## Example Error Log Entries

```text
2026-03-31T09:00:00.000000Z 0 [System] [MY-010116] [Server] /usr/sbin/mysqld (mysqld 8.0.36) starting as process 1234
2026-03-31T09:00:01.123456Z 0 [System] [MY-013576] [InnoDB] InnoDB initialization has started.
2026-03-31T09:00:02.456789Z 0 [System] [MY-013577] [InnoDB] InnoDB initialization has ended.
2026-03-31T09:00:03.789000Z 0 [Warning] [MY-010068] [Server] CA certificate ... is self signed.
2026-03-31T09:00:04.000000Z 0 [System] [MY-010931] [Server] /usr/sbin/mysqld: ready for connections. Port: 3306
```

## Error Log Format in MySQL 8.0

MySQL 8.0 uses a component-based error logging system. The log includes:

```text
<timestamp> <thread_id> [<label>] [<error_code>] [<subsystem>] <message>
```

## Configuring Error Log Components (MySQL 8.0+)

```sql
-- View current error log components
SHOW VARIABLES LIKE 'log_error_services';

-- Install and use JSON format for structured logging
INSTALL COMPONENT 'file://component_log_sink_json';
SET GLOBAL log_error_services = 'log_filter_internal; log_sink_json';

-- Install and use syslog instead of file
INSTALL COMPONENT 'file://component_log_sink_syseventlog';
SET GLOBAL log_error_services = 'log_filter_internal; log_sink_syseventlog';
```

## Common Error Log Messages and Their Meaning

```text
[ERROR] [MY-000067] unknown variable 'innodb_buffer_pool_siz=1G'
-- Typo in configuration file

[ERROR] [MY-010262] Can't start server: Bind on TCP/IP port: Address already in use
-- Another process is already using port 3306

[Note] [MY-011971] Redo log encryption is enabled. Table id: 5, space id: 4
-- Normal InnoDB note when encryption is active

[Warning] [MY-010068] CA certificate ... is self signed.
-- SSL certificate warning (non-fatal)
```

## Reading the Error Log

```bash
# Tail the log in real time
tail -f /var/log/mysql/error.log

# Filter for errors only
grep '\[ERROR\]' /var/log/mysql/error.log

# Show last startup sequence
grep 'starting\|ready for connections' /var/log/mysql/error.log | tail -20
```

## Flushing the Error Log

```bash
# Rotate the error log file
mysqladmin -u root -p flush-logs

# Or from within MySQL
FLUSH ERROR LOGS;
```

## Monitoring Error Log with Shell

```bash
# Watch for new errors in real time
tail -f /var/log/mysql/error.log | grep -E '\[ERROR\]|\[Warning\]'
```

## Summary

The MySQL error log is the essential diagnostic resource for server-level issues. It captures startup failures, InnoDB recovery events, configuration errors, and runtime warnings. Always check the error log first when MySQL fails to start or experiences unexpected behavior. In MySQL 8.0, the logging system is modular and supports JSON output for integration with centralized log management systems.

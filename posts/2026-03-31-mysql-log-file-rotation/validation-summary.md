# Validation Summary: How to Manage MySQL Log File Rotation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7 and 8.0+)
- logrotate (Linux log rotation utility)
- mysqladmin CLI tool
- MySQL binary logs, error logs, slow query logs, general query logs
- MySQL Event Scheduler

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Log Maintenance — https://dev.mysql.com/doc/refman/8.0/en/log-file-maintenance.html
- MySQL 8.0 Reference Manual: The Binary Log — https://dev.mysql.com/doc/refman/8.0/en/binary-log.html
- MySQL 8.0 Reference Manual: `binlog_expire_logs_seconds` — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_expire_logs_seconds
- MySQL 8.0 Reference Manual: `PURGE BINARY LOGS` — https://dev.mysql.com/doc/refman/8.0/en/purge-binary-logs.html
- MySQL 8.0 Reference Manual: `SHOW BINARY LOGS` — https://dev.mysql.com/doc/refman/8.0/en/show-binary-logs.html
- MySQL 8.0 Reference Manual: `SHOW REPLICA STATUS` — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: `information_schema.FILES` — https://dev.mysql.com/doc/refman/8.0/en/information-schema-files-table.html
- MySQL 8.0 Reference Manual: `CREATE EVENT` — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- logrotate(8) man page

## Issues Found

1. **Incorrect SQL query for monitoring binary log disk usage**: The post included a query against `information_schema.FILES` using columns `LOG_NAME` and `FILE_SIZE` with `WHERE FILE_TYPE = 'UNDO LOG'`. This was wrong on multiple levels: (a) `information_schema.FILES` does not have `LOG_NAME` or `FILE_SIZE` columns — the actual columns are `FILE_NAME`, `INITIAL_SIZE`, `MAXIMUM_SIZE`, etc.; (b) `FILE_TYPE = 'UNDO LOG'` filters for InnoDB undo log files, not binary logs; (c) there is no `information_schema` view for binary log files. **Fix**: Replaced the incorrect query with a reference to `SHOW BINARY LOGS`, which is the correct and standard way to view binary log file names and sizes from within MySQL.

2. **Inconsistent field name in SHOW REPLICA STATUS comment**: The post uses `SHOW REPLICA STATUS` (introduced in MySQL 8.0.22 as the non-deprecated replacement for `SHOW SLAVE STATUS`) but then references `Master_Log_File`, which is the old field name from `SHOW SLAVE STATUS`. The corresponding field in `SHOW REPLICA STATUS` output is `Source_Log_File`. **Fix**: Updated the comment to reference `Source_Log_File`.

## Review Notes
- The `expire_logs_days` variable is deprecated as of MySQL 8.0.3 in favor of `binlog_expire_logs_seconds`. The post correctly notes this. If both are set to non-default values, `binlog_expire_logs_seconds` takes precedence.
- The logrotate configuration is Debian/Ubuntu-specific (uses `/etc/mysql/debian.cnf`). Other distributions may require different credential handling (e.g., using `~/.my.cnf` or `login-path`).
- The `FLUSH BINARY LOGS` command is correct (MySQL 5.7.x+). In older versions, only `FLUSH LOGS` was available.
- The `CREATE EVENT` syntax is correct and functional. Note that the event scheduler must be enabled (`event_scheduler = ON`) for events to execute, which the post correctly demonstrates.

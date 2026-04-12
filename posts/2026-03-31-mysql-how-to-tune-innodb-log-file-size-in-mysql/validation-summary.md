# Validation Summary: How to Tune InnoDB Log File Size in MySQL

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MySQL 5.7
- MySQL 8.0 (including 8.0.30+)
- InnoDB storage engine
- InnoDB redo log (write-ahead log)
- performance_schema

## Sources Consulted
- MySQL 8.0 InnoDB Parameters Reference: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Redo Log Documentation: https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 5.7 Redo Log Documentation: https://dev.mysql.com/doc/refman/5.7/en/innodb-redo-log.html
- MySQL 8.0 Server Status Variables: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0.30 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-30.html
- MySQL 8.0 performance_schema innodb_redo_log_files Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-innodb-redo-log-files-table.html

## Issues Found

1. **Incorrect default log file size calculation**: The post stated "2 x 50 MB = 100 MB" but `innodb_log_file_size` defaults to 50331648 bytes which is 48 MB (not 50 MB). The correct total is 2 x 48 MB = 96 MB. Fixed the text accordingly.

2. **Non-existent status variable in LSN measurement query**: The post queried `performance_schema.global_status` for `Innodb_lsn_last_checkpoint`, which does not exist as a server status variable. This query would return an empty result set. Replaced with `Innodb_os_log_written`, which is the standard status variable for measuring redo log write volume and is available across MySQL 5.7 and 8.0.

3. **Unnecessary manual log file removal for MySQL 5.7**: The post instructed readers to manually `rm` the ib_logfile0 and ib_logfile1 files before restarting MySQL 5.7. Since MySQL 5.6.8+, the server automatically detects log file size changes on startup and recreates the files. Removed the manual deletion steps and added a comment explaining the automatic behavior.

## Review Notes
- The `innodb_log_file_size` and `innodb_log_files_in_group` variables are deprecated as of MySQL 8.0.30 in favor of `innodb_redo_log_capacity`. The post correctly covers both the legacy and new approaches but could mention the deprecation more explicitly.
- The 60-second checkpoint heuristic is reasonable practical advice but is not from official MySQL documentation; it originates from community best practices (Percona, etc.).
- The guidance to size total redo log at 1-2x hourly write volume is a well-established Percona recommendation and is sound advice.

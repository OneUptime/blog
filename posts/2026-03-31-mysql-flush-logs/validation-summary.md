# Validation Summary: How to Use FLUSH LOGS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+ (FLUSH LOGS, binary logs, error logs, slow query logs, relay logs)
- Bash scripting (log rotation automation)
- Linux logrotate (mentioned in context)

## Sources Consulted
- MySQL 8.0 Reference Manual: FLUSH Statement — https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual: SHOW BINARY LOGS — https://dev.mysql.com/doc/refman/8.0/en/show-binary-logs.html
- MySQL 8.0 Reference Manual: PURGE BINARY LOGS — https://dev.mysql.com/doc/refman/8.0/en/purge-binary-logs.html
- MySQL 8.4 Reference Manual: SHOW BINARY LOG STATUS — https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.4 Release Notes (deprecation/removal of SHOW MASTER STATUS)

## Issues Found
1. **`SHOW MASTER STATUS` replaced with `SHOW BINARY LOG STATUS`**: The backup workflow section used `SHOW MASTER STATUS`, which was deprecated in MySQL 8.2.0 and removed in MySQL 8.4.0 (the current LTS release). Users on MySQL 8.4+ would receive an error. Changed to `SHOW BINARY LOG STATUS`, which is the replacement command introduced in MySQL 8.2.0.

## Review Notes
- The post states "MySQL 8.0 allows you to flush individual log types" — while accurate, individual log flush commands (`FLUSH BINARY LOGS`, etc.) were actually introduced in MySQL 5.5.3. This is not wrong but could be more precise.
- The example `SHOW BINARY LOGS` output shows the newest file (mysql-bin.000043) with a file_size of 1024, larger than the older files at 156. In practice, a freshly created binary log file would typically be the smallest since it only contains the format description event. This is cosmetic and doesn't affect the tutorial's correctness.
- The description of `FLUSH ERROR LOGS` says it "closes the current file and opens a new one." More precisely, with the default error log sink, it closes and reopens the same file path. A truly new file is only created if the old file was renamed beforehand (as in the logrotate workflow described immediately after), which is the standard usage pattern.
- `SHOW BINARY LOG STATUS` requires MySQL 8.2.0+. Users still on MySQL 8.0.x should use `SHOW MASTER STATUS` instead.

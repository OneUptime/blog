# Validation Summary: What Is the General Query Log in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL (General Query Log)
- MySQL system variables (`general_log`, `general_log_file`, `log_output`)
- `mysql.general_log` system table
- `mysqladmin` CLI tool

## Sources Consulted
- MySQL 8.0 Reference Manual — The General Query Log: https://dev.mysql.com/doc/refman/8.0/en/query-log.html
- MySQL 8.0 Reference Manual — Server System Variables (general_log, general_log_file, log_output): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — FLUSH Statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual — mysqladmin Client: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html

## Issues Found
1. **Incorrect comment about SIGHUP in log rotation section.** The original comment stated `mysqladmin flush-logs` sends a SIGHUP signal. This is wrong — `mysqladmin flush-logs` connects to the MySQL server and issues a `FLUSH LOGS` SQL command over a client connection. Sending SIGHUP directly to the mysqld process is a separate mechanism. Additionally, `FLUSH LOGS` alone does not rotate the general query log — it closes and reopens the log file. Actual rotation requires renaming the existing file before flushing. Fixed by replacing the comment and adding the `mv` rename step to show a correct rotation workflow.

## Review Notes
- The "5-15% throughput reduction" performance claim is presented without a specific citation. The magnitude is plausible but will vary significantly by workload, storage type, and MySQL version. A future revision could soften this to "significant overhead" or cite a specific benchmark.
- The post accurately distinguishes between FILE and TABLE output destinations and correctly notes that TABLE-based logging uses the `mysql.general_log` table.
- All SQL syntax, variable names, and table column references are accurate for MySQL 8.0+.

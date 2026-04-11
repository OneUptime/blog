# Validation Summary: How to Purge Old Binary Logs in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (8.0+)
- Binary logging and replication
- Bash shell scripting

## Sources Consulted
- MySQL 8.0 Reference Manual: PURGE BINARY LOGS Statement — https://dev.mysql.com/doc/refman/8.0/en/purge-binary-logs.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: SHOW REPLICAS — https://dev.mysql.com/doc/refman/8.0/en/show-replicas.html
- MySQL 8.0 Reference Manual: binlog_expire_logs_seconds — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_expire_logs_seconds
- MySQL 8.0 Reference Manual: FLUSH BINARY LOGS — https://dev.mysql.com/doc/refman/8.0/en/flush.html#flush-binary-logs

## Issues Found

1. **SHOW REPLICA STATUS described as running on the source server.** The comment said "On the source server, check all replica positions" but `SHOW REPLICA STATUS` must be run on each replica, not on the source. Fixed the comment to say "On each replica, check its replication position" and added `SHOW REPLICAS;` for the source server side.

2. **Outdated column names mixed with modern command syntax.** The post used `SHOW REPLICA STATUS` (MySQL 8.0.22+) but referenced the old column names `Relay_Master_Log_File` and `Exec_Master_Log_Pos`. Updated to the renamed equivalents `Relay_Source_Log_File` and `Exec_Source_Log_Pos` (MySQL 8.0.26+) for consistency.

3. **Shell script replica lag check was a dummy query.** The query `SELECT MAX(Seconds_Behind_Source) FROM (SELECT 0 AS Seconds_Behind_Source) AS dummy` always returns 0 and does not actually check replica lag. Replaced with `SHOW REPLICAS;` which lists connected replicas so the DBA can verify their status before proceeding.

## Review Notes
- The `FLUSH BINARY LOGS` claim (that it triggers immediate cleanup of expired logs) is correct — it rotates the current log and triggers the automatic purge of logs older than `binlog_expire_logs_seconds`.
- The shell script passes the password on the command line via `-p"$(cat ...)"`, which causes MySQL to emit an "insecure" warning. Using `--defaults-extra-file` or `mysql_config_editor` would be better practice, but this is not technically incorrect and is a common pattern in documentation.
- The deprecated `expire_logs_days` variable is not mentioned, which is appropriate since the post targets MySQL 8.0+ with `binlog_expire_logs_seconds`.

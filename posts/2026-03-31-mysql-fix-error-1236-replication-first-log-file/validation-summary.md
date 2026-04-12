# Validation Summary: How to Fix ERROR 1236 Replication Error Could Not Find First Log File in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL 8.0 (8.0.22+ based on syntax used)
- MySQL Replication (binary log position-based and GTID-based)
- mysqldump
- MySQL binary logging configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS (introduced 8.0.22) — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO (introduced 8.0.23) — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: mysqldump --source-data option (introduced 8.0.26) — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: binlog_expire_logs_seconds — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual: expire_logs_days deprecation — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual: GTID replication — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids.html

## Issues Found
- **Deprecated `expire_logs_days` shown alongside `binlog_expire_logs_seconds` in the same config block.** The original config section showed both `expire_logs_days = 14` and `binlog_expire_logs_seconds = 1209600` under the same `[mysqld]` section. In MySQL 8.0, `expire_logs_days` is deprecated and if both are set at startup, `expire_logs_days` is ignored with a warning. Since the entire post uses MySQL 8.0.22+ syntax (SHOW REPLICA STATUS, CHANGE REPLICATION SOURCE TO, --source-data), showing the deprecated variable in the recommended config is misleading and would cause a startup warning. Fixed by removing `expire_logs_days` and adding a comment noting its deprecation.

## Review Notes
- The post consistently uses MySQL 8.0.22+ syntax throughout (SHOW REPLICA STATUS, CHANGE REPLICATION SOURCE TO, --source-data=2), which is correct and modern.
- The GTID section correctly shows the minimal config needed but readers should be aware that enabling GTID on an existing replication setup requires a coordinated migration on both source and all replicas — this is mentioned implicitly but could be a gotcha for readers.
- The `--single-transaction` flag is correctly recommended for InnoDB tables; it would not provide a consistent snapshot for MyISAM tables, but this is a reasonable default assumption for modern MySQL usage.
- The math for `binlog_expire_logs_seconds = 1209600` is correct (14 days × 86400 seconds/day).

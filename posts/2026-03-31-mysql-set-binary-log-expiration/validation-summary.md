# Validation Summary: How to Set Binary Log Expiration in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0 (binary logging subsystem)
- MySQL 5.7 (referenced for backwards compatibility)
- MySQL Group Replication / InnoDB Cluster
- MySQL Clone plugin

## Sources Consulted
- MySQL 8.0 Reference Manual — Binary Logging Options and Variables: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.4 Reference Manual — Binary Logging Options and Variables: https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html
- MySQL 8.0.11 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-11.html
- MySQL 8.0 Reference Manual — The Binary Log: https://dev.mysql.com/doc/refman/8.0/en/binary-log.html
- InnoDB Cluster and Binary Log Purging: https://dev.mysql.com/doc/mysql-shell/8.0/en/innodb-cluster-binary-log-purging.html

## Issues Found

1. **Incorrect claim that binary logs accumulate indefinitely by default.**
   - **What was wrong:** The opening paragraph stated "Binary logs accumulate indefinitely unless you configure automatic expiration." This is only true for MySQL 5.7 and MySQL 8.0 versions prior to 8.0.11. Starting with MySQL 8.0.11, the default value of `binlog_expire_logs_seconds` was changed from 0 to 2592000 (30 days), so binary logs do expire automatically by default.
   - **What was changed:** Rewrote the opening paragraph to accurately describe the default behavior across MySQL versions.
   - **Why:** Readers on MySQL 8.0.11+ would be misled into thinking their logs have no automatic expiration when they actually do.

2. **Incorrect claim about Group Replication / InnoDB Cluster automatic purge prevention.**
   - **What was wrong:** The post stated "On group replication or InnoDB Cluster setups, MySQL automatically prevents purging of binary logs still needed by group members." This is inaccurate — MySQL does NOT automatically prevent purging of needed binary logs. This is actually a documented limitation.
   - **What was changed:** Corrected to explain that MySQL 8.0.17+ uses the Clone plugin to automatically provision rejoining members with a full data copy when binary logs needed for incremental recovery have already been purged.
   - **Why:** The original claim could give readers a false sense of safety, potentially leading to replication failures when members try to rejoin a group after an extended absence.

## Review Notes
- All SQL syntax (`SET GLOBAL`, `SHOW VARIABLES LIKE`, `FLUSH BINARY LOGS`, `PURGE BINARY LOGS BEFORE/TO`, `SHOW BINARY LOGS`) is correct.
- The arithmetic for seconds-to-days conversions (604800 = 7 days, 1209600 = 14 days) is correct.
- The `max_binlog_size` default of 1GB is correct.
- The `expire_logs_days` deprecation/removal timeline (deprecated in 8.0, removed in 8.4) is accurate.
- The `sync_binlog = 1` recommendation is correctly framed as a durability measure, not a purge-prevention mechanism.
- The description of when automatic purging occurs (server start and binary log flush/rotation) is accurate per the MySQL docs.

# Validation Summary: How to Troubleshoot MySQL Replication Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL 8.0.22+ / MySQL 8.4+ replication
- MySQL binary log replication (file-position and GTID modes)
- MySQL Performance Schema replication tables
- mysqldump for replica rebuilds
- MySQL parallel replication (LOGICAL_CLOCK)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.4 Reference Manual: SHOW BINARY LOG STATUS (replacement for SHOW MASTER STATUS) — https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: sql_replica_skip_counter system variable — https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html
- MySQL 8.0 Reference Manual: GTID replication — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids.html
- MySQL 8.0 Reference Manual: replica_parallel_workers and replica_parallel_type — https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html
- MySQL 8.0 Reference Manual: mysqldump --source-data option — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## Issues Found

1. **`Last_SQL_Error_Number` incorrect column name**: The comment on line 73 referenced `Last_SQL_Error_Number`, but the actual column name in `SHOW REPLICA STATUS` output is `Last_SQL_Errno`. Fixed to `Last_SQL_Errno`.

2. **`SHOW MASTER STATUS` is deprecated/removed**: The post uses modern MySQL 8.0.22+/8.4+ syntax throughout (SHOW REPLICA STATUS, CHANGE REPLICATION SOURCE TO, START REPLICA, Replica_IO_Running column names), but line 162 used the deprecated `SHOW MASTER STATUS` command, which was deprecated in MySQL 8.2.0 and removed in MySQL 8.4.0. Fixed to `SHOW BINARY LOG STATUS`.

3. **Inconsistent column names `Relay_Master_Log_File` and `Exec_Master_Log_Pos`**: Since the post uses MySQL 8.4+ column names elsewhere (e.g., `Replica_IO_Running`, `Seconds_Behind_Source`), the references to `Relay_Master_Log_File` and `Exec_Master_Log_Pos` were inconsistent. These are the old (MySQL 8.0.x) column names. Fixed to `Relay_Source_Log_File` and `Exec_Source_Log_Pos` to match MySQL 8.4+ output.

## Review Notes
- The post targets MySQL 8.0.22+ / 8.4+ based on the modern command and column names used. Readers on older MySQL versions (5.7 or early 8.0.x) would need to use the older syntax (SHOW SLAVE STATUS, CHANGE MASTER TO, etc.).
- The `replica_parallel_type = 'LOGICAL_CLOCK'` setting became the default in MySQL 8.0.27+ and the variable was deprecated in MySQL 8.3.0. For MySQL 8.4+ users, only `replica_parallel_workers` needs to be set. The post's explicit setting is not incorrect but could note this for modern MySQL versions.
- The Option 2 fix for duplicate key errors (lines 92-98) does not explicitly STOP REPLICA before modifying data. Since the SQL thread is already stopped due to the error, this works in practice, but explicitly stopping both threads before making manual changes is considered best practice.
- The `read_only` toggle approach assumes the replica doesn't have `super_read_only = ON`, which is common in production setups. Users with `super_read_only` enabled would need to disable that as well.

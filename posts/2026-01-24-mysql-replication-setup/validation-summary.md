# Validation Summary: How to Configure MySQL Replication

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- MySQL asynchronous replication
- MySQL GTID-based replication
- MySQL binary logs and relay logs
- mysqldump backups
- MySQL Performance Schema replication tables
- MySQL Group Replication
- Bash monitoring script

## Sources Consulted
- MySQL 8.4 Reference Manual: Creating a User for Replication - https://dev.mysql.com/doc/refman/8.4/en/replication-howto-repuser.html
- MySQL 8.4 Reference Manual: Setting the Replica Configuration - https://dev.mysql.com/doc/refman/8.4/en/replication-howto-slavebaseconfig.html
- MySQL 8.4 Reference Manual: CHANGE REPLICATION SOURCE TO Statement - https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html
- MySQL 8.4 Reference Manual: Checking Replication Status - https://dev.mysql.com/doc/refman/8.4/en/replication-administration-status.html
- MySQL 8.4 Reference Manual: Skipping Transactions - https://dev.mysql.com/doc/refman/8.4/en/replication-administration-skip.html
- MySQL 8.4 Reference Manual: mysqldump - https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- MySQL 8.4 Reference Manual: Performance Schema replication_connection_status Table - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-connection-status-table.html
- MySQL 8.4 Reference Manual: Performance Schema replication_applier_status_by_worker Table - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL 8.4 Reference Manual: Group Replication Variables - https://dev.mysql.com/doc/refman/8.4/en/group-replication-options.html
- MySQL 8.4 Reference Manual: What Is New in MySQL 8.4 since MySQL 8.0 - https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html

## Issues Found
- Replaced `expire_logs_days` with `binlog_expire_logs_seconds = 604800` because MySQL 8.4 documentation directs users to use `binlog_expire_logs_seconds`.
- Replaced `SHOW MASTER STATUS` with `SHOW BINARY LOG STATUS` because MySQL 8.4 marks `SHOW MASTER STATUS` as no longer supported/current terminology.
- Replaced `log_slave_updates` with `log_replica_updates` in the replica configuration and reference table to use current MySQL replication terminology.
- Corrected the replication status field note from `Last_Error` to `Last_IO_Error / Last_SQL_Error`, matching `SHOW REPLICA STATUS` output.
- Fixed the Performance Schema monitoring query by replacing nonexistent `LAST_PROCESSED_TRANSACTION` and misplaced `LAST_QUEUED_TRANSACTION_IMMEDIATE_COMMIT_TIMESTAMP` references with columns from `replication_applier_status_by_worker`.
- Replaced `SQL_SLAVE_SKIP_COUNTER` with `sql_replica_skip_counter`, the current variable name for non-GTID transaction skipping.
- Replaced an invalid large-transaction query that compared InnoDB process-list thread IDs to Performance Schema worker thread IDs with a direct query against `replication_applier_status_by_worker`.
- Updated the parallel replication comment to clarify that the shown `replica_*` variables use MySQL 8.0.26+ terminology.

## Review Notes
The post uses current MySQL 8 source/replica terminology. Older MySQL releases may require the legacy master/slave statement and variable aliases, but the corrected examples align with current MySQL documentation.

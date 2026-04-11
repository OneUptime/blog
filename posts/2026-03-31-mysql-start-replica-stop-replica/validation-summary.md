# Validation Summary: How to Use START REPLICA and STOP REPLICA Statements in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0 (8.0.22+)
- MySQL Replication (binary log position-based and GTID-based)
- Multi-source replication channels

## Sources Consulted
- MySQL 8.0 Reference Manual: START REPLICA Statement (https://dev.mysql.com/doc/refman/8.0/en/start-replica.html)
- MySQL 8.0 Reference Manual: STOP REPLICA Statement (https://dev.mysql.com/doc/refman/8.0/en/stop-replica.html)
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html)
- MySQL 8.0 Reference Manual: sql_replica_skip_counter System Variable (https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html)
- MySQL 8.0 Reference Manual: Privileges (https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html)
- MySQL 8.0.22 Release Notes (https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-22.html)

## Issues Found
No technical issues found. All SQL syntax, field names, variable names, privilege references, and explanations are correct for current MySQL 8.0.

## Review Notes
- The `sql_replica_skip_counter` system variable (used as `SET GLOBAL SQL_REPLICA_SKIP_COUNTER = 1`) was introduced in MySQL 8.0.26, not 8.0.22. The post does not claim otherwise — it correctly attributes only `START REPLICA`/`STOP REPLICA` to 8.0.22. However, readers running MySQL 8.0.22–8.0.25 would need to use the deprecated `sql_slave_skip_counter` instead.
- The `SOURCE_LOG_FILE` and `SOURCE_LOG_POS` options in the UNTIL clause were introduced in MySQL 8.0.23. Readers on MySQL 8.0.22 would need to use the deprecated `MASTER_LOG_FILE` and `MASTER_LOG_POS` instead.
- These version caveats are minor since the post targets "MySQL 8" broadly and uses the current recommended syntax throughout, which is the correct editorial choice for a forward-looking tutorial.
- The `SHOW REPLICA STATUS` field names (`Replica_IO_Running`, `Replica_SQL_Running`, `Seconds_Behind_Source`, `Last_IO_Error`, `Last_SQL_Error`) are all correct for the `SHOW REPLICA STATUS` variant (as opposed to the deprecated `SHOW SLAVE STATUS` which uses the old `Master`/`Slave` naming).

# Validation Summary: How to Monitor Replication Status with SHOW REPLICA STATUS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0.22+ replication
- `SHOW REPLICA STATUS` command
- MySQL Performance Schema (`replication_connection_status`, `replication_applier_status_by_worker`)
- GTID-based replication
- Multi-source replication channels

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0.22 Release Notes (renaming of SLAVE to REPLICA terminology) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-22.html
- MySQL 8.0 Reference Manual: Performance Schema Replication Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-tables.html

## Issues Found
1. **Inconsistent column names in Log Positions section**: The post correctly used the new MySQL 8.0.22+ column names (`Replica_IO_Running`, `Replica_SQL_Running`, `Seconds_Behind_Source`) throughout most of the post, but the Log Positions section still used the old `Master_*` column names (`Master_Log_File`, `Read_Master_Log_Pos`, `Relay_Master_Log_File`, `Exec_Master_Log_Pos`). In MySQL 8.0.22+, these were renamed to `Source_Log_File`, `Read_Source_Log_Pos`, `Relay_Source_Log_File`, and `Exec_Source_Log_Pos`. Fixed all four column names and the corresponding inline references to use the new naming convention.

## Review Notes
- The `Last_IO_Errno`, `Last_IO_Error`, `Last_SQL_Errno`, and `Last_SQL_Error` field names were not renamed in 8.0.22 and remain correct as shown.
- The `Retrieved_Gtid_Set` and `Executed_Gtid_Set` field names are also correct and were not renamed.
- The Performance Schema queries use correct table and column names.
- The post could mention that `SHOW SLAVE STATUS` was deprecated in MySQL 8.0.22 and removed in MySQL 8.4, but this is not an error in the current content.

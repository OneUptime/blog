# Validation Summary: How to Use SHOW BINARY LOGS in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0 / 8.4
- MySQL Binary Logging (binlog)
- MySQL Replication
- mysqlbinlog CLI utility
- Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW BINARY LOGS — https://dev.mysql.com/doc/refman/8.0/en/show-binary-logs.html
- MySQL 8.0 Reference Manual: SHOW MASTER STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-master-status.html
- MySQL 8.4 Reference Manual: SHOW BINARY LOG STATUS — https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.0 Reference Manual: PURGE BINARY LOGS — https://dev.mysql.com/doc/refman/8.0/en/purge-binary-logs.html
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: binlog_format system variable — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_format
- MySQL 8.4 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/8.4/en/

## Issues Found

1. **SHOW MASTER LOGS deprecation not noted**: The alias `SHOW MASTER LOGS` is deprecated in MySQL 8.2 and removed in MySQL 8.4. Added deprecation note to the syntax section.

2. **SHOW MASTER STATUS deprecation not noted**: `SHOW MASTER STATUS` is deprecated in MySQL 8.2 and removed in MySQL 8.4. Added a note recommending `SHOW BINARY LOG STATUS` for newer versions.

3. **Incorrect SHOW REPLICA STATUS field names**: The post referenced `Relay_Master_Log_File` and `Read_Master_Log_Pos` together, but these belong to different thread contexts. `Relay_Master_Log_File` is the SQL thread's current source binlog file, while `Read_Master_Log_Pos` is the I/O thread's read position. For checking safe purge eligibility, MySQL docs recommend checking the I/O thread position: `Master_Log_File` and `Read_Master_Log_Pos`. Fixed the field pair.

4. **binlog_format deprecation not noted**: The `binlog_format` variable is deprecated in MySQL 8.0.34 and removed in MySQL 8.4 (where ROW is the only format). Added deprecation note and scoped the runtime switch to MySQL 8.0 only.

5. **Incorrect performance_schema.binary_log_status query**: The post claimed `performance_schema.binary_log_status` contains per-file size data and can be queried to aggregate binary log disk usage. This table (if it exists in MySQL 8.4) corresponds to `SHOW BINARY LOG STATUS` and shows the current binary log position, not a listing of all binary log files with sizes. Removed the incorrect SQL query and clarified that `SHOW BINARY LOGS` output must be parsed programmatically.

## Review Notes
- The post targets MySQL 8.0 but several commands and variables it uses have been deprecated or removed in MySQL 8.2/8.4. The fixes add deprecation notes to keep the post accurate across versions.
- The `expire_logs_days` deprecation note in the original post is accurate — `binlog_expire_logs_seconds` is indeed the preferred variable in MySQL 8.0+.
- The `Encrypted` column in `SHOW BINARY LOGS` output was added in MySQL 8.0.14, which the post correctly attributes to MySQL 8.0+.

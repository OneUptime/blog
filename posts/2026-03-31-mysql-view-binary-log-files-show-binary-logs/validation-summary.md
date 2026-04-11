# Validation Summary: How to View Binary Log Files in MySQL with SHOW BINARY LOGS

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (binary logging, replication administration)
- `SHOW BINARY LOGS` command
- `SHOW BINARY LOG STATUS` / `SHOW MASTER STATUS`
- `mysqlbinlog` utility
- `FLUSH BINARY LOGS` command
- Shell scripting (bash, awk) for monitoring

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW BINARY LOGS — https://dev.mysql.com/doc/refman/8.0/en/show-binary-logs.html
- MySQL 8.0 Reference Manual: SHOW MASTER STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-master-status.html
- MySQL 8.4 Reference Manual: SHOW BINARY LOG STATUS — https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.0 Reference Manual: Binary Log Options and Variables — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual: FLUSH BINARY LOGS — https://dev.mysql.com/doc/refman/8.0/en/flush.html

## Issues Found

1. **Broken SQL query in "Checking Total Binary Log Size" section**: The SQL query attempted to select `File_size` from a `(SELECT 1) AS dummy` subquery, which does not have a `File_size` column and would produce an error. The accompanying comment acknowledged the query doesn't work ("Direct query isn't possible; use shell instead"), making the entire SQL block misleading. Removed the broken SQL and kept only the working shell command with a note that `SHOW BINARY LOGS` output cannot be queried directly with SQL.

2. **Fake hardcoded SQL in "Monitoring Binary Log Growth" section**: The SQL query used hardcoded values (`'mysql-bin.000004'`, `10485760`) rather than actual data from `SHOW BINARY LOGS`, making it useless as a monitoring query. Removed the fake SQL and kept only the working shell monitoring script.

3. **`SHOW MASTER STATUS` deprecated and removed**: The post used `SHOW MASTER STATUS` without noting that it was deprecated in MySQL 8.2 and removed in MySQL 8.4, replaced by `SHOW BINARY LOG STATUS`. Updated the command to `SHOW BINARY LOG STATUS` with a note about the older command for pre-8.2 versions. Also updated the output to include the `Executed_Gtid_Set` column which is part of the actual output. Updated the Summary section to reference both commands.

## Review Notes
- The `Encrypted` column in `SHOW BINARY LOGS` output was introduced in MySQL 8.0.14. The post doesn't mention this version detail, but this is acceptable since the feature is well-established.
- In MySQL 8.0+, binary logging is enabled by default with `server_id = 1`, so the `my.cnf` configuration shown is mainly relevant for MySQL 5.7 or for customizing the binary log path. This is not incorrect but could be clarified in a future revision.
- The shell commands use `-p` which will prompt for a password interactively, and `-p"$MYSQL_PASS"` which passes it on the command line (MySQL prints a warning about this being insecure). Both approaches work but a future revision could mention using `mysql_config_editor` or a `.my.cnf` options file for credential management.

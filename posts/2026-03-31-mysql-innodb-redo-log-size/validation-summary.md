# Validation Summary: How to Configure InnoDB Redo Log Size in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0 (pre-8.0.30 and 8.0.30+)
- InnoDB storage engine
- InnoDB redo log subsystem
- performance_schema monitoring tables

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Redo Log — https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 Reference Manual: innodb_redo_log_capacity — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_redo_log_capacity
- MySQL 8.0 Reference Manual: innodb_log_file_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_log_file_size
- MySQL 8.0 Reference Manual: InnoDB Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: performance_schema.innodb_redo_log_files — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-innodb-redo-log-files-table.html

## Issues Found
1. **Inverted redo log usage formula (line ~138):** The monitoring query used `(1 - (variable_value / @@innodb_redo_log_capacity)) * 100` which calculates the **free** percentage of the redo log, not the **used** percentage. The alias was `pct_redo_used`, making the result misleading. Fixed to `(variable_value / @@innodb_redo_log_capacity) * 100` so the value correctly represents the percentage of redo log capacity currently in use.

## Review Notes
- The pre-8.0.30 procedure for changing redo log size includes manually deleting `ib_logfile0` and `ib_logfile1`. While this works and is a common practice, some MySQL 8.0 versions can handle the size change automatically on restart after a clean shutdown. The manual deletion approach is safe and well-established, so it was left as-is.
- The Mermaid diagram in the "Impact on crash recovery time" section has a `note1` node that renders as a disconnected box rather than an annotation. This is a cosmetic issue, not a technical error.
- The sizing guidelines and the 25%-of-buffer-pool rule of thumb are reasonable general recommendations, though optimal values depend heavily on workload characteristics.
- All SQL queries, configuration snippets, status variable names, and `performance_schema` table references are correct for their respective MySQL versions.

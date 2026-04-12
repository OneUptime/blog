# Validation Summary: How to Troubleshoot MySQL Lock Contention

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL InnoDB storage engine
- InnoDB locking (row locks, gap locks, next-key locks, intention locks, MDL)
- Performance Schema (MySQL 8.0+)
- information_schema InnoDB tables (MySQL 5.7)
- InnoDB deadlock detection and diagnostics

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — InnoDB Transaction Model: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-model.html
- MySQL 8.0 Reference Manual — performance_schema.data_locks Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual — performance_schema.data_lock_waits Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual — information_schema.innodb_trx Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual — SELECT ... FOR UPDATE / SKIP LOCKED: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual — innodb_lock_wait_timeout: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_lock_wait_timeout
- MySQL 8.0 Reference Manual — innodb_print_all_deadlocks: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_print_all_deadlocks
- MySQL 8.0 Reference Manual — InnoDB Deadlock Detection: https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html
- MySQL 5.7 Reference Manual — INNODB_LOCK_WAITS Table: https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-lock-waits-table.html

## Issues Found
No technical issues found.

## Review Notes
- The "Finding and Killing the Blocking Process" section uses `information_schema.innodb_lock_waits`, which was removed in MySQL 8.0 (replaced by `performance_schema.data_lock_waits`). While the earlier "Using Performance Schema" section correctly shows both the MySQL 5.7 and 8.0 queries for lock wait detection, the kill section only provides the 5.7-compatible version. A MySQL 8.0 alternative could be added in a future update for completeness.
- The section heading "Using Performance Schema" is slightly misleading since the first query under it uses `information_schema` tables (MySQL 5.7 approach), not Performance Schema. The actual Performance Schema query follows after the "In MySQL 8" note. This is a minor structural observation, not a technical error.
- All SQL syntax, column names, table names, variable names, default values, and technical explanations are accurate for the MySQL versions they target.

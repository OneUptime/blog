# Validation Summary: How to Tune MySQL for OLTP Workloads

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MySQL 8.0.30+ (InnoDB)
- sysbench (benchmarking tool)
- Python (mysql-connector / PyMySQL for batch insert example)
- performance_schema and information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: The data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: InnoDB INFORMATION_SCHEMA Transaction and Locking Information — https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-transactions.html
- MySQL 5.7 Reference Manual: INNODB_LOCK_WAITS Table (deprecated) — https://dev.mysql.com/doc/mysql-infoschema-excerpt/5.7/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: innodb_redo_log_capacity — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_redo_log_capacity
- MySQL 8.0 Reference Manual: innodb_autoinc_lock_mode — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_autoinc_lock_mode

## Issues Found

### 1. `information_schema.innodb_lock_waits` removed in MySQL 8.0
- **What was wrong:** The lock waits query used `information_schema.innodb_lock_waits` with columns `blocking_trx_id` and `requesting_trx_id`. This table was removed in MySQL 8.0 (deprecated since 5.7). Since the post uses `innodb_redo_log_capacity` (introduced in MySQL 8.0.30), it clearly targets MySQL 8.0+.
- **What was changed:** Replaced with `performance_schema.data_lock_waits` and updated join columns to `BLOCKING_ENGINE_TRANSACTION_ID` and `REQUESTING_ENGINE_TRANSACTION_ID`. Also updated the summary paragraph reference from `innodb_lock_waits` to `data_lock_waits`.
- **Why:** The original query would fail with a "table doesn't exist" error on any MySQL 8.0+ instance.

### 2. Incorrect EXPLAIN output column name
- **What was wrong:** The comment said `-- Should show "ref_type: const"`. There is no `ref_type` column in MySQL EXPLAIN output.
- **What was changed:** Corrected to `-- Should show "type: const"`.
- **Why:** The EXPLAIN access type column is named `type`, not `ref_type`. The `ref` column exists but serves a different purpose (showing which columns are compared to the index).

## Review Notes
- The `innodb_buffer_pool_instances` setting is deprecated in MySQL 8.4 and ignored when `innodb_buffer_pool_size` is >= 1GB. For MySQL 8.0.x it remains valid.
- The `innodb_autoinc_lock_mode = 2` explanation is correct. Note that in MySQL 8.0+, mode 2 is already the default, so setting it explicitly is harmless but redundant.
- The sysbench commands, InnoDB configuration values, connection management settings, Python batch insert pattern, and SELECT ... FOR UPDATE example are all technically correct.

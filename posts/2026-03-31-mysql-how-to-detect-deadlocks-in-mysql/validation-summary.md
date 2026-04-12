# Validation Summary: How to Detect Deadlocks in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- performance_schema
- information_schema
- Python (mysql-connector-python)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Deadlock Detection — https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html
- MySQL 8.0 Reference Manual: innodb_print_all_deadlocks — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_print_all_deadlocks
- MySQL 8.0 Reference Manual: data_lock_waits table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: data_locks table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual: Migrating from INNODB_LOCK_WAITS — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-lock-waits-table.html

## Issues Found
- **Incorrect lock waits query (lines 98-108)**: The query used `information_schema.innodb_lock_waits` with columns `blocking_trx_id` and `requesting_trx_id`. These tables were removed in MySQL 8.0 and replaced by `performance_schema.data_lock_waits` with columns `BLOCKING_ENGINE_TRANSACTION_ID` and `REQUESTING_ENGINE_TRANSACTION_ID`. The section title mentioned "performance_schema" but the query used the old `information_schema` tables. Fixed to use the correct MySQL 8.0 tables and column names. The `information_schema.innodb_trx` table is still valid in MySQL 8.0 and was kept for the JOIN targets.

## Review Notes
- The "Using performance_schema for Deadlock History" section title is slightly misleading — `performance_schema.data_locks` shows currently held locks, not historical deadlock events. The query itself is correct for MySQL 8.0.
- The deadlock victim selection description ("least work done") is a simplification. InnoDB actually selects the victim based on the approximate weight of rows inserted, updated, or deleted (undo log size). The simplification is reasonable for a blog post.
- The "preventing deadlocks" SQL example using `LEAST()`/`GREATEST()` demonstrates lock ordering but conflates it with transfer direction (always debits the lower ID). In a real implementation, the debit/credit logic would need to be conditional based on which account is the sender. This is acceptable as a conceptual illustration.

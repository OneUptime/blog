# Validation Summary: How to Understand Table-Level Locking in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB, MyISAM, MEMORY, MERGE storage engines)
- MySQL table-level locking and metadata locks
- MySQL Performance Schema and information_schema
- MySQL Online DDL (ALGORITHM=INPLACE, LOCK=NONE)

## Sources Consulted
- MySQL 8.0 Reference Manual: Table Locking — https://dev.mysql.com/doc/refman/8.0/en/lock-tables.html
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: Server Status Variables (Table_locks_waited, Table_locks_immediate) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: SHOW OPEN TABLES — https://dev.mysql.com/doc/refman/8.0/en/show-open-tables.html
- MySQL 8.0 Migration Guide: Removed Features — https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html

## Issues Found
1. **Deprecated `information_schema.innodb_lock_waits` table**: The query in the "Checking for Active Table Locks" section used `information_schema.innodb_lock_waits`, which was removed in MySQL 8.0.1 (2017). Since MySQL 5.7 reached end-of-life in October 2023, a 2026-dated post should target MySQL 8.0+. Fixed by replacing with `performance_schema.data_lock_waits` and updating the join columns from `blocking_trx_id`/`requesting_trx_id` to `BLOCKING_ENGINE_TRANSACTION_ID`/`REQUESTING_ENGINE_TRANSACTION_ID`.
2. **Misleading comment**: The original comment said "Check for table lock waits in Performance Schema" but the query actually used `information_schema`. Corrected the comment to "Check for InnoDB lock waits (MySQL 8.0+)" which is both accurate about the source and the MySQL version requirement.

## Review Notes
- The InnoDB lock waits query in the "Checking for Active Table Locks" section technically shows InnoDB row-level lock waits, not table-level locks. However, it is still useful in the context of monitoring lock contention alongside `SHOW OPEN TABLES`, so no change was made beyond fixing the comment.
- The lock wait percentage query uses `performance_schema.global_status`, which is correct for MySQL 8.0+ (in 5.7, `information_schema.global_status` was deprecated in favor of performance_schema).
- The `VARIABLE_VALUE` column in `performance_schema.global_status` returns strings, but MySQL implicitly casts to numeric in arithmetic expressions, so the percentage calculation works correctly.
- The online DDL example (`ALGORITHM=INPLACE, LOCK=NONE` for adding a TEXT column) is correct for MySQL 5.6+ and remains valid in MySQL 8.0+.

# Validation Summary: How to Use MySQL SHOW ENGINE INNODB STATUS

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (SHOW ENGINE INNODB STATUS, sys schema views, performance_schema, information_schema)
- InnoDB internals (buffer pool, semaphores, transactions, deadlock detection, I/O threads)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW ENGINE Statement — https://dev.mysql.com/doc/refman/8.0/en/show-engine.html
- MySQL 8.0 Reference Manual: InnoDB Standard Monitor and Lock Monitor Output — https://dev.mysql.com/doc/refman/8.0/en/innodb-standard-monitor.html
- MySQL 8.0 Reference Manual: innodb_print_all_deadlocks — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_print_all_deadlocks
- MySQL 8.0 Reference Manual: data_lock_waits table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: innodb_lock_wait_timeout — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_lock_wait_timeout
- MySQL 8.0 Migration Guide: Removed information_schema tables — https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html

## Issues Found
1. **Outdated lock waits query using removed information_schema tables**: The "Full lock detail" query used `information_schema.INNODB_LOCK_WAITS` with columns `requesting_trx_id` and `blocking_trx_id`. These tables were removed in MySQL 8.0 (released April 2018) and replaced by `performance_schema.data_lock_waits` with columns `REQUESTING_ENGINE_TRANSACTION_ID` and `BLOCKING_ENGINE_TRANSACTION_ID`. Since MySQL 5.7 reached end of life in October 2023, the query would fail on all supported MySQL versions. Fixed by updating the query to use `performance_schema.data_lock_waits` with the correct column names, and added a `(MySQL 8.0+)` note to the comment.

## Review Notes
- The `sys.innodb_lock_waits` view (first query in that section) works correctly on MySQL 8.0+ as it was internally updated to use the new performance_schema tables.
- The `innodb_lock_wait_timeout` default of 50 seconds is correctly stated.
- All output examples accurately reflect real InnoDB status output formatting and section headers.
- The deadlock diagnosis guidance and common patterns table are accurate and practical.
- The buffer pool hit rate threshold guidance (below 990/1000) is reasonable, though workload-dependent.

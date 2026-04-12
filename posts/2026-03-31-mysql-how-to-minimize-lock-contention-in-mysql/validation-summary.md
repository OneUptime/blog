# Validation Summary: How to Minimize Lock Contention in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (8.0+)
- InnoDB storage engine
- MySQL Performance Schema
- MySQL sys schema
- MySQL stored procedures

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Locking (https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- MySQL 8.0 Reference Manual: Transaction Isolation Levels (https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)
- MySQL 8.0 Reference Manual: performance_schema table_lock_waits_summary_by_table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-lock-waits-summary-by-table-table.html)
- MySQL 8.0 Reference Manual: sys.innodb_lock_waits view (https://dev.mysql.com/doc/refman/8.0/en/sys-innodb-lock-waits.html)
- MySQL 8.0 Reference Manual: ROW_COUNT() function (https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count)
- MySQL 8.0 Reference Manual: DO statement (https://dev.mysql.com/doc/refman/8.0/en/do.html)
- MySQL 8.0 Reference Manual: EXPLAIN for DML statements (https://dev.mysql.com/doc/refman/8.0/en/explain.html)

## Issues Found
No technical issues found.

## Review Notes
- The `@@transaction_isolation` variable name is specific to MySQL 8.0+. In MySQL 5.7 and earlier, the variable was named `@@tx_isolation`. The post does not specify a MySQL version, but since 8.0 is the current mainstream version, this is acceptable.
- The stored procedure uses `DO SLEEP(0.1)` between batches, which is a valid approach. In production, the sleep duration and batch size should be tuned based on workload characteristics.
- The sharded counter example assumes `shard_id` has a UNIQUE or PRIMARY KEY constraint for `ON DUPLICATE KEY UPDATE` to work correctly. This is implied but not explicitly stated.

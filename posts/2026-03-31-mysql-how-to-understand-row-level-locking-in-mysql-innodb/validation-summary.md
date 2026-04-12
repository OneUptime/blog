# Validation Summary: How to Understand Row-Level Locking in MySQL InnoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB row-level locking (shared locks, exclusive locks, intention locks, record locks, gap locks, next-key locks)
- MySQL transaction isolation levels (REPEATABLE READ, READ COMMITTED)
- information_schema and performance_schema for lock monitoring
- sys.innodb_lock_waits view

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: innodb_trx Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: sys.innodb_lock_waits View — https://dev.mysql.com/doc/refman/8.0/en/sys-innodb-lock-waits.html
- MySQL 8.0 Reference Manual: data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 5.7 Reference Manual: innodb_lock_waits Table — https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual: SET TRANSACTION Statement — https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html

## Issues Found
1. **Missing version qualifier for `information_schema.innodb_lock_waits` query**: The `information_schema.innodb_lock_waits` table was removed in MySQL 8.0. The post presented this query without noting it only works on MySQL 5.7 and earlier. Added explicit version labeling ("MySQL 5.7 and earlier") and a note that the table was removed in MySQL 8.0.

2. **Incorrect column name `locked_table_name` in `sys.innodb_lock_waits` query**: The standard column name in the `sys.innodb_lock_waits` view is `locked_table`, which has been present since the view was introduced. The column `locked_table_name` was only added in MySQL 8.0.33+. Changed to `locked_table` for broader compatibility across MySQL 8.0 versions.

## Review Notes
- The explanations of lock types (shared, exclusive, intention, record, gap, next-key) are accurate and well-structured.
- The description of next-key locks preventing phantom reads under REPEATABLE READ is correct.
- The advice about reducing lock contention (short transactions, consistent row access order, proper indexes, READ COMMITTED for no gap locks) is sound and accurate.
- The SHOW ENGINE INNODB STATUS example output is realistic and correctly described.
- All SQL syntax is correct (FOR SHARE, FOR UPDATE, SET SESSION TRANSACTION ISOLATION LEVEL).

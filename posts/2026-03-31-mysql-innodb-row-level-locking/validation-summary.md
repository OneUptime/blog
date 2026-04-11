# Validation Summary: How to Understand InnoDB Row-Level Locking in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB row-level locking (record locks, gap locks, next-key locks, insert intention locks)
- MySQL performance_schema and information_schema
- MVCC (Multi-Version Concurrency Control)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — InnoDB Transaction Model: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-model.html
- MySQL 8.0 Reference Manual — data_lock_waits Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual — data_locks Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual — INNODB_TRX Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual — InnoDB Server Status Variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html

## Issues Found
- **Incorrect lock-wait monitoring query**: The original query self-joined `information_schema.INNODB_TRX` with `ON r.trx_id != b.trx_id WHERE r.trx_state = 'LOCK WAIT'`. This does not correctly identify blocking relationships — it pairs each waiting transaction with *every other* active transaction, not just the one actually holding the conflicting lock. Replaced with a query that joins `performance_schema.data_lock_waits` to `INNODB_TRX` using `REQUESTING_ENGINE_TRANSACTION_ID` and `BLOCKING_ENGINE_TRANSACTION_ID`, which accurately maps waiting transactions to their actual blockers.

## Review Notes
- `SELECT ... LOCK IN SHARE MODE` is used in the examples. While this syntax still works in MySQL 8.0+, the preferred equivalent is `SELECT ... FOR SHARE`. Both are valid and `LOCK IN SHARE MODE` is not deprecated, so this is not an error.
- The `performance_schema.data_locks` table (used in the post) and `performance_schema.data_lock_waits` (used in the fix) are available in MySQL 8.0+. In MySQL 5.7 and earlier, the equivalents were `information_schema.INNODB_LOCKS` and `information_schema.INNODB_LOCK_WAITS`. The post does not specify a MySQL version, but the use of `performance_schema.data_locks` implies MySQL 8.0+, which is consistent with the fix.
- All other technical claims (lock types, MVCC behavior, index-based locking, lock wait status variables, contention reduction strategies) are accurate.

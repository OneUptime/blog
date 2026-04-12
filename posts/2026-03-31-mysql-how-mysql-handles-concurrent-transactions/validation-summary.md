# Validation Summary: How MySQL Handles Concurrent Transactions

## Status
validated

## Post Type
Tutorial / Technical Explainer

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- MVCC (Multi-Version Concurrency Control)
- SQL (locking reads, isolation levels, performance_schema)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Locking (https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- MySQL 8.0 Reference Manual: InnoDB Transaction Isolation Levels (https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)
- MySQL 8.0 Reference Manual: InnoDB Deadlock Detection (https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html)
- MySQL 8.0 Reference Manual: data_lock_waits Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html)
- MySQL 8.0 Reference Manual: INNODB_TRX Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html)

## Issues Found
1. **Monitoring Lock Waits query used removed tables/columns**: The query in the "Monitoring Lock Waits" section referenced `information_schema.INNODB_LOCK_WAITS` with columns `requesting_trx_id` and `blocking_trx_id`. This table was removed in MySQL 8.0 (it only existed in MySQL 5.7 and earlier, which reached end of life in October 2023). Fixed by updating to use `performance_schema.data_lock_waits` with the correct column names `REQUESTING_ENGINE_TRANSACTION_ID` and `BLOCKING_ENGINE_TRANSACTION_ID`.

## Review Notes
- The post uses `LOCK IN SHARE MODE` syntax, which still works in MySQL 8.0+ but has been supplemented by the SQL-standard `FOR SHARE` syntax since MySQL 8.0. Both are valid; `FOR SHARE` is preferred for new code.
- The description of exclusive locks as blocking "both reads and writes" is a common simplification. Technically, X locks block other lock-acquiring operations, not MVCC consistent reads (which the MVCC section correctly explains). This simplification is acceptable given the post's structure.
- The footnote about phantom read prevention in REPEATABLE READ attributing it to "gap locks" is slightly simplified; InnoDB uses MVCC for consistent (non-locking) reads and next-key locks (which include gap locks) for locking reads. The post's explanation is adequate for the target audience.

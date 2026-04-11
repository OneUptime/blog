# Validation Summary: How to Understand Shared and Exclusive Locks in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- MySQL Performance Schema (`performance_schema.data_locks`)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: SELECT ... FOR UPDATE / FOR SHARE — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual: NOWAIT and SKIP LOCKED — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html#innodb-locking-reads-nowait-skip-locked
- MySQL 8.0 Reference Manual: data_locks table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html

## Issues Found
- **Incomplete lock_mode filter in data_locks query**: The `WHERE lock_mode IN ('S', 'X', 'S,GAP', 'X,GAP')` clause was missing `S,REC_NOT_GAP` and `X,REC_NOT_GAP`, which are the most common row-level record lock modes in InnoDB. Without these, users querying the `data_locks` table would miss seeing many actual row locks. Added both modes to the IN list.

## Review Notes
- The post correctly qualifies exclusive lock blocking behavior with "(with locking reads)", distinguishing it from plain non-locking SELECTs which still work via MVCC. This is an important nuance that many posts get wrong.
- The `ORDER BY account_id` advice for deadlock prevention in the bank transfer example is a valid and commonly recommended pattern, though it's worth noting that InnoDB acquires locks during the index scan, and the lock acquisition order depends on the execution plan rather than the ORDER BY clause. For primary key lookups this generally works as expected.
- `LOCK IN SHARE MODE` is deprecated in favor of `FOR SHARE` as of MySQL 8.0 but still supported. The post correctly presents it as the older equivalent.
- The `performance_schema.data_locks` table replaced the older `INFORMATION_SCHEMA.INNODB_LOCKS` table in MySQL 8.0. The post correctly uses the newer table.

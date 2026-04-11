# Validation Summary: What Is a Gap Lock in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- InnoDB locking mechanisms (gap locks, record locks, next-key locks)
- MySQL Performance Schema (`performance_schema.data_locks`)
- MySQL transaction isolation levels (REPEATABLE READ, READ COMMITTED, SERIALIZABLE)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — InnoDB Transaction Isolation Levels: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual — `performance_schema.data_locks` Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual — InnoDB Deadlocks: https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html
- MySQL 8.0 Reference Manual — Phantom Rows: https://dev.mysql.com/doc/refman/8.0/en/innodb-next-key-locking.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly simplifies the relationship between gap locks and next-key locks. In practice, `SELECT ... FOR UPDATE` with range conditions acquires next-key locks (record lock + gap lock), but the post's focus on gap locks specifically is appropriate for its scope.
- The statement "switching to READ COMMITTED disables gap locks" is a standard simplification. MySQL docs note that at READ COMMITTED, gap locking is disabled for searches and index scans but is still used for foreign-key constraint checking and duplicate-key checking. This nuance is minor and the post's framing matches how the MySQL documentation itself describes it.
- The deadlock example is valid for the case where no rows exist in the queried range (only gap locks are acquired, no record locks). If rows existed in the range, Session 2's `SELECT ... FOR UPDATE` would block on Session 1's record locks before reaching the INSERT step. This edge case doesn't undermine the example's correctness as a demonstration of gap lock deadlocks.
- The `performance_schema.data_locks` table is available in MySQL 8.0+. The older `information_schema.INNODB_LOCKS` table was removed in 8.0. The post does not specify a MySQL version, but the queries are current for MySQL 8.0+.

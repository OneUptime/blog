# Validation Summary: How to Understand Gap Locks in MySQL InnoDB

## Status
validated

## Post Type
Tutorial / Explainer

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- InnoDB locking mechanisms (gap locks, next-key locks, record locks)
- Performance Schema (`data_locks` table)
- Transaction isolation levels (REPEATABLE READ, SERIALIZABLE, READ COMMITTED)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — Phantom Rows: https://dev.mysql.com/doc/refman/8.0/en/innodb-phantom-rows.html
- MySQL 8.0 Reference Manual — Transaction Isolation Levels: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual — `performance_schema.data_locks` table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html

## Issues Found

**Incorrect example in "Gap Locks Are Not Exclusive Between Readers" section**

- **What was wrong:** The example showed two sessions both executing `SELECT * FROM orders WHERE amount BETWEEN 100 AND 200 FOR UPDATE` and claimed neither session blocks the other. This is incorrect. `SELECT ... FOR UPDATE` with a range condition acquires **next-key locks** (a combination of record lock + gap lock on the gap before each scanned record). While the gap lock components are indeed compatible between transactions, the record lock components (exclusive X locks on matching rows) would cause Session 2 to block waiting on Session 1.
- **What was changed:** Replaced the example with two sessions querying for non-existent values (`amount = 150` and `amount = 160`) where no matching rows exist. In this case, only pure gap locks are acquired (no record locks), correctly demonstrating that gap locks are compatible. Added a clarifying note that when matching rows exist, `FOR UPDATE` acquires next-key locks whose record lock component will block between sessions.
- **Why:** The original example conflated pure gap locks with next-key locks. The MySQL documentation states "Gap locks can co-exist. A gap lock taken by one transaction does not prevent another transaction from taking a gap lock on the same gap," but this only applies to the gap lock component, not to the full next-key lock.

## Review Notes
- The "Why Gap Locks Exist" section uses a plain `SELECT` (non-locking read) to illustrate the phantom read scenario. Under InnoDB's REPEATABLE READ, plain `SELECT` uses MVCC consistent snapshots and would not see phantoms even without gap locks. Gap locks specifically protect locking reads (`SELECT ... FOR UPDATE`, `SELECT ... LOCK IN SHARE MODE`). The section frames this as a hypothetical ("Without gap locks") which is acceptable for pedagogical purposes, but readers should be aware that gap locks specifically apply to locking reads.
- The `performance_schema.data_locks` table referenced in the post is available in MySQL 8.0.1+. In MySQL 5.7 and earlier, the equivalent was `INFORMATION_SCHEMA.INNODB_LOCKS` (now removed in 8.0). The post does not specify a MySQL version, but the query is correct for MySQL 8.0+.
- Under READ COMMITTED, gap locks are disabled for index scans and searches, but are still used for foreign-key constraint checking and duplicate-key checking. The post's simplified claim is acceptable for its scope.
- The deprecated `innodb_locks_unsafe_for_binlog` variable (removed in MySQL 8.0) was another way to disable gap locks in older versions. The post correctly recommends READ COMMITTED as the current approach.

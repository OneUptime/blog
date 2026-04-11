# Validation Summary: How to Use SERIALIZABLE Isolation Level in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL transaction isolation levels
- InnoDB locking mechanisms (shared locks, exclusive locks, next-key locks)

## Sources Consulted
- MySQL 8.0 Reference Manual — Transaction Isolation Levels: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — SELECT ... FOR SHARE and FOR UPDATE: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual — SET TRANSACTION Statement: https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html
- MySQL 8.0 Reference Manual — InnoDB Status Variables: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html

## Issues Found

1. **`LOCK IN SHARE MODE` replaced with `FOR SHARE`**: The post stated that InnoDB converts plain SELECTs to `SELECT ... LOCK IN SHARE MODE`. While `LOCK IN SHARE MODE` still works, MySQL 8.0 documentation describes the SERIALIZABLE behavior as converting to `SELECT ... FOR SHARE`, which is the current preferred syntax. Updated the description accordingly.

2. **Incorrect comment about shared lock behavior**: The inventory example had a comment stating "no other session can read or modify this row concurrently." This is incorrect — shared (S) locks are compatible with other shared locks, so other sessions CAN still read the row. Only writes are blocked. Changed to: "no other session can modify this row until this transaction commits."

3. **Stored procedure syntax in plain SQL example**: The inventory example used `IF ROW_COUNT() = 0 THEN ... ROLLBACK; ELSE ... COMMIT; END IF;` which is stored procedure/routine syntax and would cause a syntax error if executed as plain SQL. Replaced with comments instructing the reader to check `ROW_COUNT()` in application code and a simple `COMMIT` statement.

## Review Notes
- The post correctly notes that SERIALIZABLE converts reads to locking reads, but omits the caveat from the MySQL docs that this conversion only occurs when `autocommit` is disabled. Since all examples in the post use `START TRANSACTION` (which implicitly disables autocommit for the transaction scope), the examples are correct as written. A future enhancement could mention this caveat.
- The distinction between REPEATABLE READ and SERIALIZABLE regarding phantom reads is accurately described. Under REPEATABLE READ, plain SELECTs use MVCC consistent snapshots (no range locks), while SERIALIZABLE adds shared next-key locks that physically prevent inserts into the range.
- The deadlock scenario is correctly illustrated and is a realistic concern with SERIALIZABLE isolation.

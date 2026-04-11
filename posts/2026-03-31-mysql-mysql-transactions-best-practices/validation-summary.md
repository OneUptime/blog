# Validation Summary: How to Handle MySQL Transactions Best Practices

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL transaction isolation levels (READ COMMITTED, REPEATABLE READ)
- SQL: START TRANSACTION, COMMIT, ROLLBACK, SAVEPOINT, SELECT ... FOR UPDATE
- Python (generic MySQL connection pattern)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Transaction Model — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-model.html
- MySQL 8.0 Reference Manual: Consistent Nonlocking Reads — https://dev.mysql.com/doc/refman/8.0/en/innodb-consistent-read.html
- MySQL 8.0 Reference Manual: InnoDB Locking Reads — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual: Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual: SAVEPOINT, ROLLBACK TO SAVEPOINT — https://dev.mysql.com/doc/refman/8.0/en/savepoint.html
- MySQL 8.0 Reference Manual: SET TRANSACTION Statement — https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html

## Issues Found

### 1. Incorrect claim about shared locks on plain SELECT (Line 20)
- **What was wrong:** The comment stated that a plain `SELECT * FROM products` inside a transaction "holds shared locks unnecessarily." Under InnoDB with REPEATABLE READ (the default), a plain SELECT is a consistent nonlocking read using MVCC. It does not acquire any row-level shared locks.
- **What was changed:** Changed the comment from "holds shared locks unnecessarily" to "keeps MVCC snapshot open unnecessarily" and adjusted the preceding comment from "does not need a lock" to "does not need it."
- **Why:** The real cost of a long-running transaction with reads is that it prevents purging of old undo log row versions (affecting garbage collection), not that it holds shared locks. The original claim could mislead readers about InnoDB's locking behavior.

### 2. Ambiguous phrasing about phantom reads with READ COMMITTED (Line 41)
- **What was wrong:** The SQL comment said READ COMMITTED "avoids phantom reads concern." READ COMMITTED actually *allows* phantom reads (each read within a transaction sees the latest committed snapshot). The phrasing could mislead readers into thinking READ COMMITTED prevents phantom reads, when in fact it is REPEATABLE READ (with InnoDB's gap locking) that prevents them.
- **What was changed:** Changed "avoids phantom reads concern" to "accepts phantom reads in exchange for more concurrency."
- **Why:** The corrected phrasing makes it clear that phantom reads are a trade-off you accept when choosing READ COMMITTED, not something it eliminates.

## Review Notes
- The Python code example uses a generic connection API (`conn.begin()`, `conn.execute()`) that doesn't match any specific MySQL library exactly (pymysql uses cursors for execute, mysql-connector-python uses `start_transaction()`). However, the pattern shown — try/except with explicit rollback — is the important takeaway and is correct conceptually.
- The deadlock prevention example uses `LEAST(from_id, to_id)` and `GREATEST(from_id, to_id)` as pseudocode placeholders. In real SQL these would need to be actual values or session variables, but the concept demonstrated is sound.
- The `SHOW VARIABLES LIKE 'transaction_isolation'` command is correct for MySQL 5.7.20+ and 8.0+. The older `tx_isolation` variable was deprecated in 5.7.20.

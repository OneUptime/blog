# Validation Summary: What Is ACID in MySQL

## Status
validated

## Post Type
Tutorial / Explainer

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (transactions, DDL, DML)
- ACID transaction properties
- MySQL isolation levels (REPEATABLE READ, READ COMMITTED, etc.)
- InnoDB internals (redo log, undo log, MVCC, row-level locking)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB and the ACID Model — https://dev.mysql.com/doc/refman/8.0/en/mysql-acid.html
- MySQL 8.0 Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK — https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual: InnoDB Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual: Consistent Nonlocking Reads — https://dev.mysql.com/doc/refman/8.0/en/innodb-consistent-read.html
- MySQL 8.0 Reference Manual: innodb_flush_log_at_trx_commit — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit
- MySQL 8.0 Reference Manual: CHECK Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual: transaction_isolation system variable — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_transaction_isolation

## Issues Found
- **CHECK constraint error comment placement**: The error comment `-- ERROR if balance < 500: check constraint violation prevents inconsistency` was placed after the `COMMIT` statement, implying the error occurs at commit time. In MySQL, CHECK constraint violations are raised immediately when the violating statement (`UPDATE`) executes, not at `COMMIT`. Moved the comment to directly after the `UPDATE` statement and updated wording to include the actual MySQL error code (3819) for accuracy.

## Review Notes
- **Atomicity comment nuance**: The code comment "If any error occurs here, both updates are rolled back" is slightly imprecise. In MySQL, a statement-level error (e.g., constraint violation on the second UPDATE) does NOT automatically roll back the entire transaction — only the failed statement is rolled back, and the transaction remains open. The application must explicitly issue ROLLBACK. However, the explanatory paragraph below correctly focuses on connection drops (which do cause automatic full rollback), so the overall section conveys the right idea.
- **Isolation snapshot timing**: The comment "The transaction has a consistent snapshot from when it started" is slightly imprecise. Per MySQL docs, in REPEATABLE READ the consistent read snapshot is established by the first read in the transaction, not by START TRANSACTION itself (unless START TRANSACTION WITH CONSISTENT SNAPSHOT is used). In the example the first SELECT is the first statement, so the practical behavior shown is correct.
- **CHECK constraint version dependency**: CHECK constraints are only enforced in MySQL 8.0.16+. Earlier versions parsed but silently ignored them. The post doesn't mention a specific MySQL version, which is acceptable given that MySQL 8.0 is the current major release, but readers on older versions should be aware.
- All SQL syntax, variable names (`transaction_isolation`, `innodb_flush_log_at_trx_commit`), and system table references (`information_schema.TABLES`) are correct for MySQL 8.0+.
- The `innodb_flush_log_at_trx_commit` values (0, 1, 2) are accurately described.
- The summary section correctly identifies redo log, undo log, MVCC, row-level locking, and constraint enforcement as the mechanisms underlying ACID in InnoDB.

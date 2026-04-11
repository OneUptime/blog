# Validation Summary: How to Set Transaction Isolation Level in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DDL and DML syntax)
- Transaction isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE)
- MVCC (Multi-Version Concurrency Control)
- MySQL configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual: Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual: SET TRANSACTION Statement — https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html
- MySQL 8.0 Reference Manual: Consistent Nonlocking Reads — https://dev.mysql.com/doc/refman/8.0/en/innodb-consistent-read.html
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: Server System Variables (transaction_isolation) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_transaction_isolation

## Issues Found
1. **REPEATABLE READ snapshot timing**: The post stated that the consistent snapshot is taken "as of the start of the transaction." According to MySQL documentation, in InnoDB's REPEATABLE READ, the snapshot is established at the time of the **first read operation** within the transaction, not at `START TRANSACTION`. (Using `START TRANSACTION WITH CONSISTENT SNAPSHOT` would establish it at transaction start, but that syntax was not used in the examples.) Fixed the description on line 118 and the code comment on line 133 to accurately reflect this behavior.

## Review Notes
- The claim that InnoDB's REPEATABLE READ prevents phantom reads via gap locks and MVCC is correct and well-stated. InnoDB uses MVCC for consistent (non-locking) reads and next-key locks (gap locks + record locks) for locking reads, both of which prevent phantoms — a stronger guarantee than the SQL standard requires.
- The SERIALIZABLE description uses "range locks" as a simplification; InnoDB technically uses next-key locks (record lock + gap lock). This is an acceptable simplification for a blog audience.
- The `@@transaction_isolation` variable and `transaction_isolation` config directive are the current names (MySQL 5.7.20+). The deprecated `@@tx_isolation` / `tx_isolation` names are correctly not used.
- The my.cnf configuration correctly uses hyphenated values (`READ-COMMITTED`) as required by MySQL's option file syntax.
- All SQL syntax (`SET SESSION TRANSACTION ISOLATION LEVEL`, `SET GLOBAL TRANSACTION ISOLATION LEVEL`, `SET TRANSACTION ISOLATION LEVEL`) is correct per MySQL documentation.

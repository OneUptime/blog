# Validation Summary: How to Use READ COMMITTED Isolation Level in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL transaction isolation levels (READ COMMITTED)
- Binary logging / replication configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: SET TRANSACTION Statement — https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html
- MySQL 8.0 Reference Manual: Binary Logging Formats — https://dev.mysql.com/doc/refman/8.0/en/binary-log-formats.html
- PostgreSQL Documentation: Transaction Isolation — https://www.postgresql.org/docs/current/transaction-iso.html

## Issues Found
1. **Inaccurate locking behavior description (line 78)**: The original text stated "READ COMMITTED uses row-level locks only for DML (INSERT, UPDATE, DELETE). It does not use gap locks for reads." This was inaccurate because locking reads (`SELECT ... FOR UPDATE`, `SELECT ... FOR SHARE`) also acquire row-level locks under READ COMMITTED — not just DML statements. The post's own example demonstrated `SELECT ... FOR UPDATE` acquiring a lock, contradicting the claim. Fixed to: "READ COMMITTED uses row-level locks for locking reads (SELECT ... FOR UPDATE, SELECT ... FOR SHARE) and DML (INSERT, UPDATE, DELETE), but does not use gap locks, which reduces lock contention."

## Review Notes
- The `binlog_format` system variable shown in the "Enabling READ COMMITTED for Binary Logging" section was deprecated in MySQL 8.0.34 and removed in MySQL 8.4.0. In MySQL 8.4+, row-based replication is the only format and cannot be changed. The information is accurate for MySQL 5.7 and MySQL 8.0 (prior to 8.4), but readers on MySQL 8.4+ should be aware this section no longer applies.
- The gap lock example uses `SELECT * FROM orders WHERE id = 5 FOR UPDATE` on what is likely a primary key. Under REPEATABLE READ, this specific query (unique index, exact match, existing row) would also only take a record lock, not a gap lock. A range condition or non-unique index would better illustrate the READ COMMITTED gap lock difference. However, the comment is technically correct for READ COMMITTED.
- The post does not mention phantom reads, which are also possible under READ COMMITTED. This is an omission rather than an error, as the post focuses on the key difference from REPEATABLE READ (non-repeatable reads).

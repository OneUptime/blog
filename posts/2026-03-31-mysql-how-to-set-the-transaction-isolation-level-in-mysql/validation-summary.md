# Validation Summary: How to Set the Transaction Isolation Level in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL transaction isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE)
- MySQL configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual — SET TRANSACTION Statement: https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html
- MySQL 8.0 Reference Manual — InnoDB Transaction Isolation Levels: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual — Consistent Nonlocking Reads: https://dev.mysql.com/doc/refman/8.0/en/innodb-consistent-read.html

## Issues Found

1. **Incorrect "alternative syntax" for session-level isolation**: The Session-Level section listed `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;` (without the SESSION keyword) as an "Alternative syntax" for setting session-level isolation. Per the MySQL docs, without SESSION or GLOBAL, this syntax applies only to the next single transaction, not the session. Removed the incorrect alternative to avoid confusion with the per-transaction syntax correctly described later in the post.

2. **Inaccurate snapshot timing for REPEATABLE READ**: The post stated the consistent snapshot is "taken at the start of the transaction." Per the MySQL docs, the snapshot is "established by the first read" in the transaction, not by START TRANSACTION itself. A transaction could perform writes before any read, and the snapshot would not be established until the first read occurs. Changed to "established by the first read in the transaction."

3. **Deprecated locking syntax for SERIALIZABLE**: The post stated MySQL converts plain SELECTs to `SELECT ... LOCK IN SHARE MODE`. In MySQL 8.0, the correct description is `SELECT ... FOR SHARE` (with `LOCK IN SHARE MODE` being the deprecated pre-8.0 syntax). Also added the condition "if autocommit is disabled" to match the official documentation precisely.

## Review Notes
- The isolation level table correctly marks REPEATABLE READ phantom reads as "Possible*" with an asterisk noting InnoDB's gap lock protection. This is a fair representation of the nuance — the SQL standard says phantoms are possible, but InnoDB's implementation prevents them in most cases via next-key locking.
- The `transaction_isolation` variable name (used in my.cnf and SELECT @@) is correct for MySQL 5.7.20+. The older `tx_isolation` variable is not mentioned, which is fine for a modern-focused post.
- The code examples demonstrating dirty reads, non-repeatable reads, and repeatable reads are conceptually correct and clearly illustrate each isolation level's behavior.

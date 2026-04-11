# Validation Summary: What Is a Transaction in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL transactions (BEGIN, COMMIT, ROLLBACK, SAVEPOINT)
- ACID properties
- MySQL autocommit mode
- MySQL transaction isolation levels (REPEATABLE READ)
- Node.js mysql2 driver (JavaScript example)

## Sources Consulted
- MySQL 8.0 Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK Statements — https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual: InnoDB Transaction Model — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-model.html
- MySQL 8.0 Reference Manual: Consistent Nonlocking Reads — https://dev.mysql.com/doc/refman/8.0/en/innodb-consistent-read.html
- MySQL 8.0 Reference Manual: SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT Statements — https://dev.mysql.com/doc/refman/8.0/en/savepoint.html
- MySQL 8.0 Reference Manual: Flow Control Statements (IF Statement) — https://dev.mysql.com/doc/refman/8.0/en/if.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA INNODB_TRX Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html

## Issues Found

### 1. IF/THEN/ELSE control flow used in plain SQL session
- **What was wrong:** The bank transfer SQL example used `IF @rows_updated = 1 THEN COMMIT; ELSE ROLLBACK; END IF;` syntax. In MySQL, the `IF...THEN...ELSE...END IF` control flow statement is only valid inside stored programs (stored procedures, functions, triggers, and events). It cannot be used in a regular SQL client session and would produce a syntax error.
- **What was changed:** Removed the IF/THEN/ELSE/END IF block and replaced it with a comment explaining that conditional COMMIT/ROLLBACK logic would be handled in application code or a stored procedure, followed by a simple COMMIT. The JavaScript application code example immediately below already demonstrates the proper application-level approach.
- **Why:** Readers copying this SQL into a MySQL client would get a syntax error. The fix avoids presenting invalid SQL while still explaining the concept.

### 2. Incorrect REPEATABLE READ snapshot timing
- **What was wrong:** The post stated that at REPEATABLE READ, "a transaction sees a consistent snapshot of the database from the moment it started." This is inaccurate — in InnoDB's REPEATABLE READ, the consistent snapshot is established at the time of the first consistent read (SELECT) within the transaction, not when BEGIN is executed.
- **What was changed:** Updated the description to say the snapshot is "established by the first read (SELECT) within the transaction."
- **Why:** This is a documented behavior in the MySQL manual (Consistent Nonlocking Reads section). The distinction matters because statements executed between BEGIN and the first SELECT do not establish the snapshot.

## Review Notes
- The `LAST_INSERT_ID()` usage in the savepoint example is correct — `LAST_INSERT_ID()` is a session-level value not affected by ROLLBACK TO SAVEPOINT, so it retains the value from the orders INSERT as intended.
- The `SHOW VARIABLES LIKE 'transaction_isolation'` syntax is correct for MySQL 5.7.20+ and 8.0+. In older versions (pre-5.7.20), the variable was named `tx_isolation`. Since the post doesn't target a specific version and MySQL 8.0+ is the current supported release, this is fine.
- The `information_schema.INNODB_TRX` column names (`trx_id`, `trx_state`, `trx_started`, `trx_query`) are all correct.
- The JavaScript example using mysql2/promise API is accurate and follows best practices (try/catch/finally with connection.release()).

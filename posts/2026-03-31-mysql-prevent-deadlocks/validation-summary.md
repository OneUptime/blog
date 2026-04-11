# Validation Summary: How to Prevent Deadlocks in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DDL, DML, session variables)
- Python (mysql-connector-python library)
- Transaction isolation levels (READ COMMITTED)

## Sources Consulted
- MySQL 8.0 Reference Manual: Deadlock Detection — https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html
- MySQL 8.0 Reference Manual: INNODB_TRX Table (TRX_WEIGHT) — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual: Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: Compound Statement Syntax — https://dev.mysql.com/doc/refman/8.0/en/sql-compound-statements.html
- MySQL 8.0 Reference Manual: INNODB_METRICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-metrics-table.html
- MySQL Connector/Python: errorcode Module — https://dev.mysql.com/doc/connector-python/en/connector-python-api-errorcode.html

## Issues Found

1. **Incorrect deadlock victim selection description**: The post stated InnoDB "rolls back the transaction with the smallest undo log size." Per the MySQL docs, InnoDB selects the victim based on `TRX_WEIGHT`, which reflects the number of rows modified and locked — not the undo log size. Changed to "rolls back the transaction with the smallest weight, determined by the number of rows modified and locked."

2. **`Innodb_deadlocks` is not a standard MySQL status variable**: The monitoring section used `SHOW STATUS LIKE 'Innodb_deadlocks'`, which is a Percona Server extension and does not exist in standard Oracle MySQL. Replaced with the standard approach: querying `information_schema.INNODB_METRICS WHERE NAME = 'lock_deadlocks'`.

3. **`REPEAT...UNTIL...END REPEAT` used as standalone SQL**: The batch processing example in Strategy 4 used a `REPEAT` loop, which is only valid inside stored programs (procedures, functions, triggers, events) and cannot be executed as a standalone SQL statement. Simplified the example to show a single batch UPDATE statement with a comment instructing readers to run it in a loop from application code. Also removed the unused `@batch_size` variable that was declared but never referenced.

4. **Missing sleep in Python retry logic**: The comment said "Brief pause before retry" but no actual delay was implemented — `continue` just immediately retries. Added `time.sleep(0.1 * (attempt + 1))` for linear backoff and the `import time` statement.

## Review Notes
- The claim that READ COMMITTED "does not use gap locks" is mostly correct but has exceptions: gap locks are still used for foreign-key constraint checking and duplicate-key checking in READ COMMITTED. This is a minor omission that doesn't materially affect the advice given.
- Strategy 2 ("Keep Transactions Short") shows reading data outside a transaction and then writing inside one. This is a valid pattern but introduces a TOCTOU (time-of-check-time-of-use) window where data could change between the read and the write. The post could mention this trade-off in a future revision.

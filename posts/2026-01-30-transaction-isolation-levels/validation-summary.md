# Validation Summary: How to Implement Transaction Isolation Levels

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- SQL (ANSI standard isolation levels)
- PostgreSQL
- MySQL / InnoDB
- SQL Server
- Oracle
- psycopg2 (Python PostgreSQL driver)
- node-postgres (`pg` Node.js driver)

## Sources Consulted
- PostgreSQL official docs — Transaction Isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL official docs — SET TRANSACTION: https://www.postgresql.org/docs/current/sql-set-transaction.html
- psycopg2 docs — `connection.set_isolation_level` and isolation constants: https://www.psycopg.org/docs/extensions.html
- psycopg2 docs — `psycopg2.errors.SerializationFailure`: https://www.psycopg.org/docs/errors.html
- MySQL 8.0 Reference Manual — Transaction Isolation Levels (default REPEATABLE READ for InnoDB): https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- Microsoft SQL Server docs — SET TRANSACTION ISOLATION LEVEL (default READ COMMITTED): https://learn.microsoft.com/en-us/sql/t-sql/statements/set-transaction-isolation-level-transact-sql
- Oracle Database Concepts — Data Concurrency and Consistency (supports READ COMMITTED, SERIALIZABLE, READ ONLY only): https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/data-concurrency-and-consistency.html
- ANSI SQL-92 specification of the four isolation levels and the anomalies (Dirty Read, Non-repeatable Read, Phantom)
- node-postgres (`pg`) docs: https://node-postgres.com/

## Issues Found

1. **Misleading comment about PostgreSQL READ UNCOMMITTED behavior.** The SQL example labeled "PostgreSQL" used `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED` with a comment claiming "This query might see uncommitted changes from other transactions." Per PostgreSQL's official docs, PostgreSQL accepts the `READ UNCOMMITTED` syntax but internally maps it to `READ COMMITTED`, so dirty reads are not actually possible in PostgreSQL. Updated the comment to clarify this behavior and direct readers to MySQL or SQL Server for true dirty-read behavior.

2. **Undefined `product_id` in `place_order` function.** The serializable example defines `def place_order(conn):` and references `product_id` inside the function body and the SQL parameter tuple, but `product_id` was never defined or passed as an argument. This would raise a `NameError` at runtime. Added `product_id = 100` as a module-level variable above the function so the example runs correctly while preserving the function signature expected by `execute_with_retry(operation)`.

## Review Notes

- The comment in the Repeatable Read Python example, "This snapshot is locked for the duration of the transaction," is loose wording — `SELECT ... FOR UPDATE` acquires a row-level lock, and PostgreSQL's Repeatable Read provides snapshot isolation; the row lock (not the snapshot itself) is held until commit. Left as-is since it's not technically incorrect in spirit.
- `connection.set_isolation_level()` is still supported in current psycopg2 (2.9.x); the newer `connection.isolation_level = ...` property setter is also valid. Either form is fine.
- `psycopg2.errors.SerializationFailure` requires psycopg2 ≥ 2.8.
- The post's distinction that "Repeatable Read prevents non-repeatable reads but allows phantom reads" matches the ANSI standard. The note in the database-specific table correctly calls out that PostgreSQL's Repeatable Read (snapshot isolation) actually prevents phantom reads as well — a useful and accurate clarification.
- MySQL InnoDB's gap locks under REPEATABLE READ similarly prevent many phantom-read scenarios; the table's "prevents some phantom reads" wording is appropriately hedged.
- The unused `from psycopg2 import sql` import in the first Python example is harmless; left alone since it's stylistic.
- The first PostgreSQL SQL example uses `account_balances` while later examples use `accounts`. Minor inconsistency but does not affect correctness.

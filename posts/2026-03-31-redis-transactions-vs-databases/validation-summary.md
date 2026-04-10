# Validation Summary: How Transactions Work in Redis vs Traditional Databases

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Redis (MULTI/EXEC transactions, WATCH optimistic locking)
- Relational databases (PostgreSQL, MySQL)
- SQL transactions (BEGIN/COMMIT/ROLLBACK, SAVEPOINT)
- ACID properties

## Sources Consulted
- Redis official documentation on transactions: https://redis.io/docs/interact/transactions/
- Redis MULTI command documentation: https://redis.io/commands/multi/
- Redis EXEC command documentation: https://redis.io/commands/exec/
- Redis WATCH command documentation: https://redis.io/commands/watch/
- PostgreSQL documentation on transactions: https://www.postgresql.org/docs/current/tutorial-transactions.html
- PostgreSQL documentation on SAVEPOINT: https://www.postgresql.org/docs/current/sql-savepoint.html
- PostgreSQL documentation on explicit locking (SELECT FOR UPDATE): https://www.postgresql.org/docs/current/explicit-locking.html
- SQL standard isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE)

## Issues Found
1. **SQL error handling example used a non-error operation (lines 95-101):** The original example showed `UPDATE accounts SET balance = balance - 200 WHERE id = 99;` with a comment "No row 99 exists," implying this would cause a transaction failure. In SQL, an UPDATE that matches zero rows is NOT an error — it succeeds silently with 0 rows affected and would not trigger a rollback. Replaced with a duplicate primary key INSERT (`INSERT INTO accounts (id, balance) VALUES (1, 2000);` after already inserting id=1), which is an actual constraint violation error. Also changed `COMMIT` to `ROLLBACK` with clearer comments to accurately demonstrate the unified rollback behavior being discussed.

## Review Notes
- The ACID table entry for Redis ("All queued commands run or none run") is a simplification. Strictly, all commands are *attempted* — but runtime failures in individual commands do not roll back the others. The text below the table correctly clarifies this distinction, so the table entry is acceptable as a summary.
- The sequence diagram labels Client 2's GET as "blocked until EXEC completes." Redis doesn't truly block the client; it simply processes commands sequentially in its single-threaded event loop. The command is queued and processed after EXEC finishes. This is a reasonable simplification for a diagram.
- The `ROLLBACK TO sp1` syntax (without the SAVEPOINT keyword) is valid in PostgreSQL but MySQL requires `ROLLBACK TO SAVEPOINT sp1`. Since the post discusses "traditional databases" generically, this is a minor portability note but not an error.
- Since Redis 7.0, Redis Functions and other features have expanded Redis's capabilities, but the core transaction semantics described in this post remain accurate.

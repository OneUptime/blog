# Validation Summary: How to Use SKIP LOCKED and NOWAIT in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (SKIP LOCKED and NOWAIT locking clauses)
- SQL (DDL, DML, stored procedures, transaction control)
- Python (mysql.connector library)

## Sources Consulted
- MySQL 8.0 Reference Manual: Locking Reads (SELECT ... FOR UPDATE / FOR SHARE) — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual: Locks Set by Different SQL Statements in InnoDB - https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html
- MySQL 8.0 Reference Manual: ORDER BY Optimization - https://dev.mysql.com/doc/refman/8.0/en/order-by-optimization.html
- MySQL 8.0 Reference Manual: LIMIT Query Optimization - https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html
- MySQL 8.0 Reference Manual: DECLARE ... HANDLER syntax — https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html
- MySQL 8.0 Reference Manual: Server Error Message Reference (Error 3572) — https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL Connector/Python Developer Guide — https://dev.mysql.com/doc/connector-python/en/

## Issues Found
1. **DECLARE HANDLER outside stored procedure**: The "Combining NOWAIT with Error Handling" section used `DECLARE EXIT HANDLER` as standalone SQL. This syntax is only valid inside a stored procedure or function body — running it outside one would produce a syntax error. Fixed by wrapping the example in a `CREATE PROCEDURE` block with proper `DELIMITER` usage.

2. **Overly broad SQLSTATE in error handler**: The original used `DECLARE EXIT HANDLER FOR SQLSTATE 'HY000'`, which is a general SQLSTATE class covering thousands of different MySQL errors. This would catch many unrelated errors beyond NOWAIT lock failures. Fixed by using `DECLARE EXIT HANDLER FOR 3572`, which is the specific MySQL error number for "Statement aborted because lock(s) could not be acquired immediately and NOWAIT is set."

3. **Claim query serialized by filesort**: The schema indexed only `status` while the worker queries ordered by `created_at`. The locking scan feeding that filesort can lock every pending index record, defeating `SKIP LOCKED` concurrency. Fixed by adding `idx_jobs_claim (status, created_at, id)`, forcing that claim index, using `ORDER BY created_at, id` consistently, and documenting how to verify that `EXPLAIN` does not report `Using filesort`.

## Review Notes
- The job queue worker SQL pattern correctly places the final `UPDATE ... SET status = 'done'` outside the claim transaction. This is the right approach — the lock is released quickly after claiming, and processing happens without holding the row lock.
- The Python example correctly uses `mysql.connector` APIs including `cursor(dictionary=True)`, `start_transaction()`, and parameterized queries with `%s` placeholders.
- The `:claimed_id` and `:target_id` named parameter syntax used in the SQL examples is not native MySQL syntax but is a common pseudocode convention in tutorials. This is acceptable in context.
- The claim queries use `id` as a deterministic tie-breaker for jobs that share the same `created_at` value.
- The claim queries force `idx_jobs_claim` because MySQL can otherwise choose a table scan and filesort when `status` has low selectivity, even when the composite index exists.

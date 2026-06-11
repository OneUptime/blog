# Validation Summary: How to Create PostgreSQL Stored Procedures Best Practices

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- PostgreSQL (version 11+ for procedure features)
- PL/pgSQL (PostgreSQL's procedural language)
- SQL (CREATE PROCEDURE, CREATE FUNCTION, transaction control)
- JSONB processing

## Sources Consulted
- PostgreSQL documentation: CREATE PROCEDURE (https://www.postgresql.org/docs/current/sql-createprocedure.html)
- PostgreSQL documentation: CREATE FUNCTION (https://www.postgresql.org/docs/current/sql-createfunction.html)
- PL/pgSQL Control Structures (https://www.postgresql.org/docs/current/plpgsql-control-structures.html)
- PL/pgSQL Statements (https://www.postgresql.org/docs/current/plpgsql-statements.html)
- PL/pgSQL Transaction Management (https://www.postgresql.org/docs/current/plpgsql-transactions.html)
- PostgreSQL Error Codes Appendix A (https://www.postgresql.org/docs/current/errcodes-appendix.html)
- PL/pgSQL Errors and Messages: RAISE (https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html)
- PL/pgSQL Cursors and FOR loops with transaction control

## Issues Found

1. **Invalid `GET DIAGNOSTICS;` statement in `update_prices_fast` procedure** (was line 932). The original code contained `GET DIAGNOSTICS;` with no assignment target. Per the PostgreSQL docs, `GET DIAGNOSTICS` requires at least one `variable = item` assignment — calling it bare is a syntax error and the procedure would fail at CREATE time. Fixed by declaring a `v_row_count INTEGER` variable and using the proper form `GET DIAGNOSTICS v_row_count = ROW_COUNT;`, plus a `RAISE NOTICE` to make the example useful.

## Review Notes

- The function vs. procedure comparison table is accurate. Procedures were indeed introduced in PostgreSQL 11, and the called-with / transaction-control / trigger differences are all correct.
- The PostgreSQL error code table (unique_violation 23505, foreign_key_violation 23503, not_null_violation 23502, check_violation 23514, deadlock_detected 40P01, serialization_failure 40001, lock_not_available 55P03, query_canceled 57014) was cross-checked against Appendix A of the PostgreSQL docs and all codes are correct.
- The `FOR i IN 1..20 BY 2 LOOP` and `FOR i IN REVERSE 10..1 LOOP` syntax is valid PL/pgSQL per the control-structures docs.
- The claim that you cannot `COMMIT` inside a subtransaction (a block with `EXCEPTION` handlers) is correct; PostgreSQL raises an `invalid_transaction_termination` error in that case. The error message in the comment is a close paraphrase of the actual runtime message.
- `COMMIT` inside a `FOR ... IN SELECT ... LOOP` is supported in PostgreSQL — the cursor is automatically converted to a holdable cursor at the first commit, so the batch-processing examples will work as written.
- The named-argument syntax `CALL process_refund_request(p_order_id := 12345, ...)` is valid; PostgreSQL accepts both `:=` and `=>` for named notation in CALL statements.
- Custom error codes `P0001`/`P0002`/`P0003` are acceptable, though strictly speaking `P0001` is the default `raise_exception` SQLSTATE. Users wanting truly distinct application codes could use the user-defined `45000`–`45ZZZ`/`P0xxx` ranges, but this is not technically incorrect.
- Minor stylistic observation (not fixed): `clock_timestamp()` returns `timestamp with time zone`, and the `timed_operation` example assigns it to a plain `TIMESTAMP` variable. The implicit conversion works, but using `TIMESTAMPTZ` would be more precise. Left as-is since the example still functions correctly.
- The `update_prices_slow` example modifies rows of `products` while iterating over a query against the same table — this is intentionally shown as the "slow / bad" pattern, so the contrast still teaches the right lesson.

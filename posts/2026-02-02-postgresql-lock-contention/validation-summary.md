# Validation Summary: How to Handle Lock Contention in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (lock modes, MVCC, advisory locks, partitioning, materialized views, BRIN indexes)
- PL/pgSQL (functions, procedures, transaction control)
- SQL DDL and DML patterns (CTE with FOR UPDATE SKIP LOCKED, ON CONFLICT upsert, optimistic locking)
- `pg_stat_activity` and `pg_locks` system catalogs

## Sources Consulted
- PostgreSQL official docs — Explicit Locking and lock compatibility matrix: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL official docs — PL/pgSQL transaction management (COMMIT/ROLLBACK only in procedures): https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL official docs — Advisory lock functions (`pg_advisory_lock`, `pg_try_advisory_lock`, `pg_advisory_xact_lock`, `pg_advisory_unlock`): https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS
- PostgreSQL official docs — SELECT FOR UPDATE / SKIP LOCKED / NOWAIT: https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
- PostgreSQL official docs — INSERT ... ON CONFLICT: https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT
- PostgreSQL official docs — Table partitioning and partition key/PK constraints: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL official docs — BRIN indexes and `pages_per_range` storage parameter: https://www.postgresql.org/docs/current/brin.html
- PostgreSQL official docs — Runtime config (`lock_timeout`, `statement_timeout`, `idle_in_transaction_session_timeout`): https://www.postgresql.org/docs/current/runtime-config-client.html

## Issues Found
- **`batch_update_status` example used `CREATE OR REPLACE FUNCTION` with `COMMIT` inside the loop.** PostgreSQL only allows transaction control statements (`COMMIT`/`ROLLBACK`) inside *procedures* invoked with `CALL`, not inside functions. Calling the original example would have failed at runtime with `ERROR: invalid transaction termination`. Converted the example to `CREATE OR REPLACE PROCEDURE`, replaced `RETURNS INT`/`RETURN v_updated;` with a `RAISE NOTICE`, kept the loop and `COMMIT` semantics, and added a short note plus a `CALL` invocation example so the reader sees how to use it.

## Review Notes
- The lock compatibility matrix was cross-checked cell-by-cell against the PostgreSQL "Explicit Locking" docs and is correct, including the ACCESS SHARE × ACCESS EXCLUSIVE conflict and the SHARE/ROW EXCLUSIVE/SHARE UPDATE EXCLUSIVE rows.
- Lock-mode mappings for `SELECT` (ACCESS SHARE), `SELECT FOR UPDATE` (ROW SHARE), `INSERT/UPDATE/DELETE` (ROW EXCLUSIVE), `VACUUM`/`ANALYZE` (SHARE UPDATE EXCLUSIVE), `CREATE INDEX` (SHARE), and `ALTER TABLE` (ACCESS EXCLUSIVE) all match the docs. Note that `VACUUM FULL` and `CREATE INDEX CONCURRENTLY` differ from their non-`FULL`/non-`CONCURRENTLY` counterparts — this is out of scope for the diagram but worth keeping in mind for any future expansion.
- `hashtext()` is used for advisory lock keys. It is an internal/undocumented PostgreSQL function; it works reliably in practice but technically lacks a documented stability guarantee. Mentioning this caveat (or recommending a deterministic 32-bit key derivation) could be a future improvement, but it's not incorrect as written.
- The `acquire_distributed_lock` example stores `expires_at` for visibility but does not actually enforce the timeout to reclaim a stale lock — the advisory lock itself is what guards mutual exclusion. This is a design choice consistent with how advisory locks work (auto-released on session end), but readers may misread the function name as implementing lease-style expiry. Not a technical error.
- The `lock_contention_stats` view uses a manual self-join on `pg_locks` matching `locktype` and `relation`. This is the classic pre-9.6 pattern and works for relation-level conflicts but misses tuple/advisory/transactionid-only conflicts. Modern PostgreSQL (9.6+) offers `pg_blocking_pids(pid)` which is simpler and more accurate. The post's query is not wrong, just dated; left as-is.
- The transaction-level advisory lock illustrative snippet uses `user_id` as a bare identifier in `UPDATE carts ... WHERE user_id = user_id`. As shown it is intended as application-level pseudocode (the caller supplies `user_id`); inside a real PL/pgSQL function with a parameter named `user_id` this would be the classic name-shadowing trap (`column = parameter` parsed as `column = column`). Not changed because the snippet is presented as a session-level example, not a function body, but worth flagging for future revision.

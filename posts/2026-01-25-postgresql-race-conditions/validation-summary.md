# Validation Summary: How to Handle Race Conditions in PostgreSQL Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- PL/pgSQL functions
- Row-level locking with SELECT FOR UPDATE
- SKIP LOCKED queue patterns
- Advisory locks
- SERIALIZABLE transaction isolation
- Optimistic locking
- INSERT ... ON CONFLICT upserts

## Sources Consulted
- PostgreSQL documentation: Explicit Locking, including row-level locks, deadlocks, and advisory locks: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL documentation: Transaction Isolation, including Read Committed behavior, ON CONFLICT concurrency behavior, and Serializable retry requirements: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL documentation: SELECT locking clauses, NOWAIT, and SKIP LOCKED: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL documentation: PL/pgSQL Transaction Management: https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL documentation: INSERT and ON CONFLICT examples: https://www.postgresql.org/docs/current/sql-insert.html

## Issues Found
- The advisory-lock example described `hashtext(p_date::TEXT)` as generating a unique key. PostgreSQL hash output is deterministic but not collision-proof, so the comment was changed to "deterministic lock key."
- The SERIALIZABLE transaction example stated that COMMIT will fail if another transaction modified the row. PostgreSQL can raise serialization failures at statements or at commit depending on the conflict, so the comment now says a statement or COMMIT can fail and the whole transaction must be retried.
- The PL/pgSQL retry example implied retry logic for SERIALIZABLE transactions could be handled inside a function using nested transaction-like behavior. PostgreSQL documents that serialization failures require retrying the whole transaction, and PL/pgSQL functions cannot control the caller's transaction. The example was changed to a `transfer_once` function that must be called inside a SERIALIZABLE transaction and retried by application code on SQLSTATE 40001.

## Review Notes
The remaining examples are technically valid demonstrations of PostgreSQL concurrency patterns. In production, the transfer and inventory examples should also validate positive amounts and may need additional business constraints, but that is outside the race-condition mechanics being demonstrated.

# Validation Summary: How to Use Advisory Locks in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL advisory locks
- PostgreSQL `pg_locks` and `pg_stat_activity`
- PL/pgSQL
- Python
- psycopg2

## Sources Consulted
- PostgreSQL 18 Documentation: Advisory Locks, https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS
- PostgreSQL 18 Documentation: Advisory Lock Functions, https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS
- PostgreSQL 18 Documentation: `pg_locks`, https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL 18 Documentation: `lock_timeout`, https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-LOCK-TIMEOUT
- Python 3 Documentation: Data model / `__hash__`, https://docs.python.org/3/reference/datamodel.html#object.__hash__
- Psycopg 2 Documentation: Basic module usage, https://www.psycopg.org/docs/usage.html

## Issues Found
- Python examples used Python's built-in `hash()` to derive advisory lock keys. Python salts `str` and `bytes` hashes per process, so values are not predictable across interpreter runs. Replaced these with stable `hashlib.sha256`-based integer keys for distributed cron and mutex examples.
- The monitoring query for a specific advisory lock conflated the single-`bigint` and two-`integer` advisory lock key spaces. PostgreSQL stores these differently in `pg_locks` using `objsubid`. Updated the example to show a correct `bigint` lookup and a separate two-integer lookup.
- The session-lock section did not mention that repeated session-level lock acquisitions stack and require matching unlock calls. Added a short comment to prevent readers from leaking reentrant session locks.
- The duplicate-processing example described the MD5-derived key as "unique". Hash-derived keys can collide, so the comment now says "stable" instead.

## Review Notes
The main advisory-lock semantics, function names, shared/exclusive examples, transaction-level auto-release behavior, `FOR UPDATE SKIP LOCKED` usage, and `lock_timeout` example align with current PostgreSQL documentation. Future improvements could note that advisory locks consume shared lock table memory and that hash-based lock keys should be designed with collision risk in mind.

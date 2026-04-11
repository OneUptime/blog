# Validation Summary: How to Use IS_FREE_LOCK() and IS_USED_LOCK() in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+ advisory (user-level) locking functions
- `IS_FREE_LOCK()`, `IS_USED_LOCK()`, `GET_LOCK()`, `RELEASE_LOCK()`
- `information_schema.PROCESSLIST`
- `performance_schema.metadata_locks` and `performance_schema.threads`
- MySQL stored procedures

## Sources Consulted
- MySQL 8.0 Reference Manual: Locking Functions — https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html
- MySQL 8.0 Reference Manual: The metadata_locks Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-metadata-locks-table.html

## Issues Found
1. **Bug in `wait_for_lock` polling procedure — `elapsed` variable type mismatch causing infinite loop.**
   - **What was wrong:** `elapsed` was declared as `INT DEFAULT 0` while `poll_interval` was `DECIMAL(3,1) DEFAULT 0.5`. The assignment `SET elapsed = elapsed + poll_interval` truncates the fractional result back to `INT`, so `elapsed` would remain `0` indefinitely, creating an infinite loop when the lock is held.
   - **What was changed:** Changed the declaration of `elapsed` from `INT DEFAULT 0` to `DECIMAL(5,1) DEFAULT 0` so it can properly accumulate the 0.5-second increments.
   - **Why:** Without this fix, the procedure would never time out if the lock remained held, spinning forever in the `WHILE` loop.

## Review Notes
- All return values documented for `IS_FREE_LOCK()` (1, 0, NULL) and `IS_USED_LOCK()` (connection ID, NULL) are correct per MySQL 8.0 official documentation.
- The Performance Schema query correctly uses `OBJECT_TYPE = 'USER LEVEL LOCK'` to find advisory locks in `metadata_locks`.
- The post correctly notes the TOCTOU race condition between checking `IS_FREE_LOCK()`/`IS_USED_LOCK()` and calling `GET_LOCK()`, and demonstrates the proper pattern of using `GET_LOCK(..., 0)` as the authoritative acquire attempt.
- The mermaid diagrams accurately represent the lock state transitions and concurrent coordination flow.

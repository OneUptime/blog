# Validation Summary: How to Use GET_LOCK() and RELEASE_LOCK() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (GET_LOCK, RELEASE_LOCK, IS_USED_LOCK, IS_FREE_LOCK)
- MySQL Advisory Locks / User-level Locks
- MySQL Stored Procedures and Scheduled Events
- Python (mysql-connector usage with advisory locks)

## Sources Consulted
- MySQL 8.0 Reference Manual — Locking Functions: https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html
- MySQL 8.0 Reference Manual — CREATE EVENT: https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html

## Issues Found

1. **Incorrect comment for IS_USED_LOCK()**: The comment above the code said "Returns 1 if current session holds the named lock" which is wrong. `IS_USED_LOCK()` returns the **connection ID** of the session holding the lock (or NULL if the lock is free), not `1`. Fixed the comment to "Check who holds the lock" and clarified the inline comment to say "or NULL if free".

2. **IF/THEN/ELSE used outside a stored program**: The "Advisory Lock Pattern for Cron Jobs" section used `IF ... THEN ... ELSE ... END IF` as standalone SQL, but this control flow syntax is only valid inside MySQL stored programs (procedures, functions, triggers, events). Running it as plain SQL would produce a syntax error. Rewrote the example as a `CREATE EVENT` block, which is the natural MySQL mechanism for scheduled/cron-like tasks and provides a valid context for the IF/THEN control flow.

## Review Notes
- The RELEASE_LOCK() NULL description says "the lock does not exist (was never acquired)" — per MySQL docs, NULL is also returned if the lock was previously released. The parenthetical is incomplete but not incorrect enough to warrant a change.
- The post does not mention the 64-character limit on lock names, which is documented in MySQL. This is not an error but could be a useful addition in the future.
- The note about multiple locks per session being available since MySQL 5.7+ is correct. Prior to 5.7, calling GET_LOCK() would implicitly release any previously held lock.

# Validation Summary: How to Use HIGH_PRIORITY and LOW_PRIORITY in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (MyISAM, MEMORY, MERGE storage engines)
- MySQL HIGH_PRIORITY modifier for SELECT
- MySQL LOW_PRIORITY modifier for INSERT, UPDATE, DELETE
- MySQL table-level locking and lock scheduling
- InnoDB MVCC and row-level locking (for contrast)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: INSERT Statement — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual: UPDATE Statement — https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual: DELETE Statement — https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Reference Manual: Table Locking Issues — https://dev.mysql.com/doc/refman/8.0/en/table-locking.html
- MySQL 8.0 Reference Manual: Server System Variables (low_priority_updates) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: SHOW OPEN TABLES — https://dev.mysql.com/doc/refman/8.0/en/show-open-tables.html
- MySQL 8.0 Reference Manual: information_schema Tables — https://dev.mysql.com/doc/refman/8.0/en/information-schema.html

## Issues Found
1. **Incorrect information_schema table reference**: The post used `SELECT * FROM information_schema.TABLE_LOCKS;` to view current locks. There is no `TABLE_LOCKS` table in MySQL's `information_schema` in any version (5.7, 8.0, 8.4). This query would produce an error. Fixed to use `SHOW OPEN TABLES WHERE In_use > 0;`, which is the standard way to see which tables currently have locks held against them.

## Review Notes
- `HIGH_PRIORITY` and `LOW_PRIORITY` are deprecated in recent MySQL versions (8.0+). The post does not mention specific MySQL versions, but users on modern MySQL will receive deprecation warnings when using these modifiers. These features may be removed in a future release.
- `HIGH_PRIORITY` can also be used with `INSERT` statements (not just `SELECT`), though this is a less common use case. The post focuses on `HIGH_PRIORITY` for `SELECT` only, which is the primary use case and not technically incorrect.
- The `SHOW STATUS LIKE 'Table_locks_%'` command and the server/session `low_priority_updates` variable are correctly documented.
- All SQL syntax examples are correct and would execute without errors on MyISAM tables.
- The InnoDB section correctly advises using transactions and isolation levels instead of priority modifiers.

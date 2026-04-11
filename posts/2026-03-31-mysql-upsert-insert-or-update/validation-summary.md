# Validation Summary: How to Implement Upsert (Insert or Update) in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (general, with version-specific notes for 8.0.20+)
- InnoDB storage engine
- SQL (INSERT ... ON DUPLICATE KEY UPDATE, REPLACE INTO, ROW_COUNT())

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE Statement — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: REPLACE Statement — https://dev.mysql.com/doc/refman/8.0/en/replace.html
- MySQL 8.0 Reference Manual: Information Functions (ROW_COUNT()) — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0.20 Release Notes (VALUES() deprecation and alias syntax) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly distinguishes between the deprecated `VALUES()` function and the newer alias syntax introduced in MySQL 8.0.20. This is a common source of confusion and is handled well.
- The `ROW_COUNT()` return values (1 = insert, 2 = update, 0 = no-op) are accurate per MySQL documentation; this mirrors the C API `mysql_affected_rows()` behavior.
- The warnings about `REPLACE INTO` side effects (auto-increment changes, FK cascades, double trigger execution) are all accurate and important for readers to understand.
- The post could note that concurrent `ON DUPLICATE KEY UPDATE` operations may acquire next-key locks on InnoDB indexes, which can lead to deadlocks under heavy concurrency, but this is an advanced topic and not an error in the current content.

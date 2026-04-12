# Validation Summary: How to Fix ERROR 1062 Duplicate Entry for Key in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (ERROR 1062, SQLSTATE 23000)
- SQL (INSERT IGNORE, ON DUPLICATE KEY UPDATE, REPLACE INTO, DELETE with self-join, ALTER TABLE)
- Python (mysql-connector-python library)

## Sources Consulted
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE Statement — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: INSERT IGNORE — https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual: REPLACE Statement — https://dev.mysql.com/doc/refman/8.0/en/replace.html
- MySQL 8.0.20 Release Notes (deprecation of VALUES() in ON DUPLICATE KEY UPDATE) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-20.html
- MySQL 9.0 Reference Manual: Removed Features — https://dev.mysql.com/doc/refman/9.0/en/mysql-nutshell.html
- mysql-connector-python documentation: IntegrityError — https://dev.mysql.com/doc/connector-python/en/connector-python-api-errors-integrityerror.html

## Issues Found
1. **Deprecated `VALUES()` function in ON DUPLICATE KEY UPDATE (Fix 2 and Bulk Insert sections)**
   - **What was wrong:** Both `ON DUPLICATE KEY UPDATE` examples used the `VALUES(col)` syntax (e.g., `name = VALUES(name)`), which was deprecated in MySQL 8.0.20 (April 2020) and removed entirely in MySQL 9.0. Using this syntax produces deprecation warnings on MySQL 8.0.20+ and fails on MySQL 9.0+.
   - **What was changed:** Updated both examples to use the row alias syntax introduced in MySQL 8.0.20 (e.g., `VALUES (...) AS new` followed by `name = new.name`). This is the current recommended approach per the MySQL documentation.
   - **Why:** A 2026 tutorial should use the current, non-deprecated syntax to avoid teaching readers a pattern that produces warnings or errors on modern MySQL versions.

## Review Notes
- The `HAVING cnt > 1` clause uses a column alias in HAVING, which is a MySQL-specific extension to standard SQL. This is correct and idiomatic for MySQL but would not work in all SQL databases. Acceptable for a MySQL-focused post.
- The `INSERT IGNORE` caution note is appropriate — it converts all errors to warnings, not just duplicate key errors, which can mask other problems.
- The warning about `REPLACE INTO` is accurate and valuable — it performs DELETE + INSERT, which resets auto-increment values and triggers ON DELETE CASCADE actions on foreign keys.
- The Python error handling example correctly uses `mysql.connector.IntegrityError` with `e.errno == 1062`.
- The self-join DELETE pattern for cleaning duplicates is correct and a well-known MySQL pattern.

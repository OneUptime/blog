# Validation Summary: How to Implement Insert If Not Exists in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (INSERT IGNORE, ON DUPLICATE KEY UPDATE, INSERT ... SELECT)
- InnoDB (concurrency behavior with UNIQUE constraints)
- Node.js / mysql2 driver (application-level result checking)
- SQL (DDL for UNIQUE constraints, DML for conditional inserts)

## Sources Consulted
- MySQL 8.0 Reference Manual — INSERT Statement: https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — INSERT IGNORE behavior: https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#ignore-effect-on-execution
- MySQL 8.0 Reference Manual — ROW_COUNT(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- MySQL 8.0 Reference Manual — SELECT without FROM (implicit DUAL): https://dev.mysql.com/doc/refman/8.0/en/select.html
- npm mysql2 documentation for execute() and result.affectedRows

## Issues Found
No technical issues found.

## Review Notes
- The post correctly warns that INSERT IGNORE suppresses all errors (not just duplicate-key), including NOT NULL violations and data truncation. This is an important caveat often missed in similar tutorials.
- The INSERT ... SELECT without a FROM clause (Option 3) is valid MySQL syntax via the implicit DUAL table. Some readers may find `SELECT 42, 7 FROM DUAL WHERE NOT EXISTS (...)` clearer, but both forms are correct.
- The ON DUPLICATE KEY UPDATE no-op pattern (`slug = slug`) correctly results in 0 affected rows reported by MySQL when the value is unchanged, which is a useful distinction from the 2 affected rows reported when a real update occurs.
- The JavaScript example assumes the mysql2 Node.js driver, which is the most common choice. The `affectedRows` property and parameterized query syntax are correct for that library.

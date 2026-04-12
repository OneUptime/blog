# Validation Summary: How to Fix ERROR 1142 Command Denied to User in MySQL

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (privilege system, GRANT statements, user management)

## Sources Consulted
- MySQL 8.0 Reference Manual — Privilege System: https://dev.mysql.com/doc/refman/8.0/en/privilege-system.html
- MySQL 8.0 Reference Manual — GRANT Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — SHOW GRANTS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual — FLUSH PRIVILEGES: https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html
- MySQL 8.0 Reference Manual — Server Error Message Reference (Error 1142 ER_TABLEACCESS_DENIED_ERROR): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found
- **Summary section: inaccurate claim about FLUSH PRIVILEGES** — The original text stated "Run `FLUSH PRIVILEGES` after any grant change to ensure it takes effect immediately." This is misleading because `GRANT` statements automatically cause MySQL to reload the in-memory privilege tables. `FLUSH PRIVILEGES` is only required when grant tables are modified directly via `INSERT`, `UPDATE`, or `DELETE` on `mysql.user` or other grant tables. Fixed the summary to clarify this distinction. The `FLUSH PRIVILEGES` commands in the code examples were left as-is since including them is harmless and a common convention in MySQL tutorials.

## Review Notes
- The `FLUSH PRIVILEGES` statements included after every `GRANT` in the code examples are technically unnecessary (since `GRANT` triggers an automatic privilege reload), but they are harmless and widely used in MySQL documentation and tutorials. Removing them from code examples would be a stylistic choice rather than a correctness fix.
- The error number 1142 correctly corresponds to `ER_TABLEACCESS_DENIED_ERROR` with SQLSTATE 42000.
- All SQL syntax (`SHOW GRANTS`, `GRANT`, `CREATE USER`, `SELECT FROM mysql.user`) is correct for MySQL 5.7 and 8.0+.
- The privilege mapping table is accurate and covers the most common privileges that trigger ERROR 1142.
- The explanation of `USAGE` privilege as "login only" is a correct simplification — `USAGE` means "no privileges" and is the default grant.
- The stored procedure/view scenario correctly notes that callers may need privileges on underlying objects, which applies when views or procedures use `SQL SECURITY INVOKER` or when the definer lacks required privileges.

# Validation Summary: How to Revoke Privileges in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7 and 8.0+)
- MySQL REVOKE statement
- MySQL privilege system (global, database, table, column levels)
- MySQL roles (8.0+)

## Sources Consulted
- MySQL 8.0 Reference Manual — REVOKE Statement: https://dev.mysql.com/doc/refman/8.0/en/revoke.html
- MySQL 8.0 Reference Manual — GRANT Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — Privilege Changes: https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html
- MySQL 5.7 Reference Manual — When Privilege Changes Take Effect: https://dev.mysql.com/doc/refman/5.7/en/privilege-changes.html
- MySQL 8.0 Reference Manual — Using Roles: https://dev.mysql.com/doc/refman/8.0/en/roles.html

## Issues Found
1. **Incorrect claim about FLUSH PRIVILEGES requirement in MySQL 5.7**: The "Applying Changes" section stated that MySQL 8.0 changes take effect immediately but MySQL 5.7 and earlier require `FLUSH PRIVILEGES` after REVOKE. This is incorrect. In all MySQL versions, `GRANT` and `REVOKE` statements take effect immediately because the server reloads the grant tables into memory automatically. `FLUSH PRIVILEGES` is only needed when you modify the grant tables directly using DML statements (INSERT, UPDATE, DELETE on `mysql.*` tables). Fixed the section to accurately describe when `FLUSH PRIVILEGES` is actually needed.

2. **Same inaccuracy repeated in Summary section**: The closing summary also stated "In MySQL 8.0, changes take effect immediately without `FLUSH PRIVILEGES`", implying this was version-specific. Corrected to clarify that immediate effect applies to all MySQL versions.

## Review Notes
- All SQL syntax examples are correct and match the official MySQL documentation.
- The REVOKE syntax template on lines 17-22 uses `privilege_type` instead of the official `priv_type` from the MySQL docs, but this is a reasonable pedagogical choice for readability.
- The distinction between revoking privileges from a role vs. revoking a role from a user is well explained and accurate.
- Column-level REVOKE syntax is correct.
- The note about REVOKE not removing the user account (use DROP USER instead) is accurate and helpful.

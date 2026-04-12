# Validation Summary: How to Use GRANT OPTION in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+ privilege system
- GRANT / REVOKE statements
- WITH GRANT OPTION and WITH ADMIN OPTION clauses
- information_schema views (SCHEMA_PRIVILEGES, USER_PRIVILEGES)

## Sources Consulted
- MySQL 8.0 Reference Manual — GRANT Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — REVOKE Statement: https://dev.mysql.com/doc/refman/8.0/en/revoke.html
- MySQL 8.0 Reference Manual — SHOW GRANTS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual — information_schema SCHEMA_PRIVILEGES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-schema-privileges-table.html
- MySQL 8.0 Reference Manual — information_schema USER_PRIVILEGES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-user-privileges-table.html
- MySQL 8.0 Reference Manual — Roles: https://dev.mysql.com/doc/refman/8.0/en/roles.html

## Issues Found
No technical issues found.

## Review Notes
- The audit query in the Security Considerations section covers schema-level and global-level grants but does not include `information_schema.TABLE_PRIVILEGES` or `COLUMN_PRIVILEGES`. This is not an error — the query is presented as a useful audit tool, not a comprehensive one — but readers needing full coverage should extend it.
- The `WITH ADMIN OPTION` section correctly distinguishes role grants from privilege grants. This feature is available in MySQL 8.0+; the post does not specify a version, which is fine since MySQL 8.0 is the current GA series.
- All SHOW GRANTS output uses backtick-quoted identifiers, which matches MySQL 8.0+ default behavior.

# Validation Summary: How to Use SHOW GRANTS in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (SHOW GRANTS statement)
- MySQL privilege system (global, database, table, column-level privileges)
- MySQL roles (MySQL 8.0+)
- MySQL system tables (mysql.user, mysql.db)
- Bash (mysql CLI usage with diff for grant comparison)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW GRANTS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual: Grant Tables — https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual: Using Roles — https://dev.mysql.com/doc/refman/8.0/en/roles.html

## Issues Found
No technical issues found.

## Review Notes
- The `SUPER` privilege is deprecated as of MySQL 8.0.22 in favor of fine-grained dynamic privileges. The post's query for `Super_priv` still works since the column exists in `mysql.user`, but readers targeting newer MySQL versions should be aware that `SUPER` is being phased out.
- The `USING` clause for expanding role privileges requires MySQL 8.0+, where roles were introduced. This version requirement is not explicitly stated in the post but is implied by the role-related content.
- The post mentions querying `information_schema` in the "Auditing All Users" section but only shows queries against `mysql` system tables. The `information_schema` views (`USER_PRIVILEGES`, `SCHEMA_PRIVILEGES`, `TABLE_PRIVILEGES`) could also be used and may be more portable, but what's shown is correct and commonly used.

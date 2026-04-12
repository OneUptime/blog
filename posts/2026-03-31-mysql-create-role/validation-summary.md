# Validation Summary: How to Create a Role in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- MySQL Roles (CREATE ROLE, GRANT, SET DEFAULT ROLE, SET ROLE, DROP ROLE)
- MySQL system tables (mysql.role_edges)
- MySQL information_schema (APPLICABLE_ROLES view)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE ROLE: https://dev.mysql.com/doc/refman/8.0/en/create-role.html
- MySQL 8.0 Reference Manual — Using Roles: https://dev.mysql.com/doc/refman/8.0/en/roles.html
- MySQL 8.0 Reference Manual — Grant Tables (role_edges): https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html
- MySQL 8.0 Reference Manual — APPLICABLE_ROLES Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-applicable-roles-table.html

## Issues Found
- **Swapped column aliases in `mysql.role_edges` query**: The original query aliased `FROM_USER` as `role_name` and `TO_USER` as `user_name`, but in the `mysql.role_edges` table, `FROM_USER`/`FROM_HOST` refers to the **grantee** (user account) and `TO_USER`/`TO_HOST` refers to the **role**. Fixed the query to use `TO_USER AS role_name, FROM_USER AS user_name, FROM_HOST AS host`.

## Review Notes
- The `information_schema.APPLICABLE_ROLES` view was introduced in MySQL 8.0.19, not in the initial MySQL 8.0.0 release. The post says roles are "introduced in MySQL 8.0" which is correct for the role feature overall, but users on early 8.0.x versions (before 8.0.19) will not have the APPLICABLE_ROLES view available.
- All other SQL syntax (CREATE ROLE, GRANT, SET DEFAULT ROLE, SET ROLE, DROP ROLE, REVOKE, SHOW GRANTS) is correct and verified against official documentation.
- The claim that dropping a role revokes it from all users is confirmed by the docs.
- The claim that revoking privileges from a role immediately affects users with that active role is confirmed by the docs.

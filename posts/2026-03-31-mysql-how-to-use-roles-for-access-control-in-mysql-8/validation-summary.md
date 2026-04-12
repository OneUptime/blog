# Validation Summary: How to Use Roles for Access Control in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Role-Based Access Control (RBAC)
- MySQL privilege system

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE ROLE — https://dev.mysql.com/doc/refman/8.0/en/create-role.html
- MySQL 8.0 Reference Manual: SET DEFAULT ROLE — https://dev.mysql.com/doc/refman/8.0/en/set-default-role.html
- MySQL 8.0 Reference Manual: SET ROLE — https://dev.mysql.com/doc/refman/8.0/en/set-role.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: Using Roles — https://dev.mysql.com/doc/refman/8.0/en/roles.html
- MySQL 8.0 Reference Manual: role_edges Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-role-table-grants-table.html
- MySQL 8.0 Reference Manual: activate_all_roles_on_login — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_activate_all_roles_on_login

## Issues Found

1. **Invalid `SET DEFAULT ROLE ALL;` syntax (line 71)**: The `SET DEFAULT ROLE` statement requires a `TO user` clause — it is not optional. The post showed `SET DEFAULT ROLE ALL;` as a way for a user to set their own default roles, but this produces a syntax error. Fixed to `SET DEFAULT ROLE ALL TO CURRENT_USER();`.

2. **Non-existent `information_schema.ROLE_TABLE_GRANTS` table (lines 93-99)**: The post referenced `information_schema.ROLE_TABLE_GRANTS`, which does not exist in MySQL. This table name comes from PostgreSQL's information_schema. In MySQL 8.0, role grant relationships are stored in the `mysql.role_edges` system table, which has the columns `FROM_USER`, `FROM_HOST`, `TO_USER`, `TO_HOST`, and `WITH_ADMIN_OPTION`. Fixed the query to use `mysql.role_edges`.

## Review Notes
- All other SQL syntax (CREATE ROLE, GRANT to roles, GRANT roles to users, SET ROLE, REVOKE, DROP ROLE, WITH ADMIN OPTION, role nesting) is correct for MySQL 8.0.
- The `activate_all_roles_on_login` system variable and its my.cnf configuration are accurate.
- The explanation that roles are not active by default at login is correct and an important detail for users new to MySQL roles.

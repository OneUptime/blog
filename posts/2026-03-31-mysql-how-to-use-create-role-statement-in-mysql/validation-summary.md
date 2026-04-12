# Validation Summary: How to Use CREATE ROLE Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Role-Based Access Control (RBAC)
- SQL (CREATE ROLE, GRANT, REVOKE, DROP ROLE, SET ROLE, SET DEFAULT ROLE)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-role.html
- MySQL 8.0 Reference Manual: SET ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/set-role.html
- MySQL 8.0 Reference Manual: SET DEFAULT ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/set-default-role.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: Using Roles — https://dev.mysql.com/doc/refman/8.0/en/roles.html
- MySQL 8.0 Reference Manual: The role_edges Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-applicable-roles-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA Tables — https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-reference.html

## Issues Found
- **Incorrect reference to `information_schema.applicable_roles`**: The post contained a query selecting `ROLE_NAME, IS_DEFAULT, IS_MANDATORY` from `information_schema.applicable_roles`. This view does not exist in MySQL 8.0 — it is a feature of PostgreSQL and MariaDB, not MySQL. Replaced with a query against `mysql.default_roles`, which is the correct MySQL 8.0 system table for viewing default role assignments. The replacement query selects `USER, HOST, DEFAULT_ROLE_USER, DEFAULT_ROLE_HOST` from `mysql.default_roles`.

## Review Notes
- All other SQL syntax (CREATE ROLE, GRANT to roles, GRANT roles to users, SET ROLE, SET DEFAULT ROLE, REVOKE, DROP ROLE, SHOW GRANTS ... USING, mysql.role_edges queries) is correct for MySQL 8.0.
- The `activate_all_roles_on_login` system variable is correctly referenced.
- The explanation that roles were introduced in MySQL 8.0 is accurate.
- The claim that dropping a role automatically revokes it from all users is correct per MySQL documentation.

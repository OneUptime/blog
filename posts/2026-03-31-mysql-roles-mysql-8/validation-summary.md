# Validation Summary: How to Use Roles in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Role-Based Access Control (RBAC)
- MySQL privilege management

## Sources Consulted
- MySQL 8.0 Reference Manual: Using Roles — https://dev.mysql.com/doc/refman/8.0/en/roles.html
- MySQL 8.0 Reference Manual: CREATE ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-role.html
- MySQL 8.0 Reference Manual: SET ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/set-role.html
- MySQL 8.0 Reference Manual: SET DEFAULT ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/set-default-role.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: mysql.role_edges Table — https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html#grant-tables-role-edges

## Issues Found
1. **`information_schema.ROLE_EDGES` should be `mysql.role_edges`**: The `role_edges` table resides in the `mysql` system schema, not in `information_schema`. The query `SELECT FROM_USER, FROM_HOST, TO_USER, TO_HOST FROM information_schema.ROLE_EDGES` was changed to use `mysql.role_edges`. The accompanying comment was also updated from "View role membership from information_schema" to "View role membership from the mysql system schema".

2. **Missing CREATE USER for `power_user`**: The example `GRANT 'app_read', 'app_write' TO 'power_user'@'%';` referenced a user that was never created. In MySQL, you cannot grant roles to a non-existent user (unless `NO_AUTO_CREATE_USER` is absent, which is not the default). Added `CREATE USER 'power_user'@'%' IDENTIFIED BY 'strong_password_4';` before the GRANT statement.

## Review Notes
- All SQL syntax (CREATE ROLE, GRANT role TO user, SET ROLE, SET DEFAULT ROLE, REVOKE role FROM user, DROP ROLE, SET PERSIST, SHOW GRANTS ... USING, SELECT CURRENT_ROLE()) is correct for MySQL 8.0.
- The column names in `mysql.role_edges` (FROM_USER, FROM_HOST, TO_USER, TO_HOST) are accurate.
- The `activate_all_roles_on_login` system variable and its use with SET PERSIST are correct.
- The introductory text states "Revoking a role removes all its associated privileges from every user who holds it" which loosely describes DROP ROLE rather than REVOKE. However, the later code examples correctly distinguish REVOKE (per-user) from DROP ROLE (removes from all users), so this is acceptable as a conceptual overview.

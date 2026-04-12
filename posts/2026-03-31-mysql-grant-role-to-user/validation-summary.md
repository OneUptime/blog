# Validation Summary: How to Grant a Role to a User in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+ (roles feature introduced in 8.0)
- MySQL privilege system and role-based access control

## Sources Consulted
- MySQL 8.0 Reference Manual: GRANT Statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- MySQL 8.0 Reference Manual: Using Roles (https://dev.mysql.com/doc/refman/8.0/en/roles.html)
- MySQL 8.0 Reference Manual: SET ROLE Statement (https://dev.mysql.com/doc/refman/8.0/en/set-role.html)
- MySQL 8.0 Reference Manual: SET DEFAULT ROLE Statement (https://dev.mysql.com/doc/refman/8.0/en/set-default-role.html)
- MySQL 8.0 Reference Manual: SHOW GRANTS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-grants.html)
- MySQL 8.0 Reference Manual: REVOKE Statement (https://dev.mysql.com/doc/refman/8.0/en/revoke.html)
- MySQL 8.0 Reference Manual: Grant Tables — role_edges (https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html#grant-tables-role-edges)

## Issues Found
1. **Incorrect table reference: `information_schema.ROLE_TABLE_GRANTS`**
   - **What was wrong:** The post referenced `information_schema.ROLE_TABLE_GRANTS` as a way to check role assignments. This table does not exist in MySQL. It is a PostgreSQL information_schema view (defined in the SQL standard but not implemented by MySQL).
   - **What was changed:** Replaced the query to use `mysql.role_edges` (which is the correct MySQL system table for role-to-user mappings) and updated the section heading from "Checking Roles via information_schema" to "Checking Roles via mysql.role_edges".
   - **Why:** Running the original query would produce an error (`Table 'information_schema.ROLE_TABLE_GRANTS' doesn't exist`). The `mysql.role_edges` table contains the same columns (`FROM_USER`, `FROM_HOST`, `TO_USER`, `TO_HOST`, `WITH_ADMIN_OPTION`) and is the correct source for this data in MySQL 8.0+.

## Review Notes
- All SQL syntax for GRANT role, REVOKE role, SET ROLE, SET DEFAULT ROLE, and SHOW GRANTS ... USING is correct for MySQL 8.0+.
- The post correctly notes that roles are not active by default and must be activated via `SET ROLE` or `SET DEFAULT ROLE`. It could optionally mention the `activate_all_roles_on_login` system variable as another activation method, but this is not an error.
- The example output for SHOW GRANTS is realistic and correctly formatted.
- The post correctly covers granting multiple roles to one user and one role to multiple users.

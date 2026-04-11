# Validation Summary: What Is a Role in MySQL 8

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- MySQL Role-Based Access Control (RBAC)
- MySQL privilege system

## Sources Consulted
- MySQL 8.0 Reference Manual: Roles — https://dev.mysql.com/doc/refman/8.0/en/roles.html
- MySQL 8.0 Reference Manual: CREATE ROLE — https://dev.mysql.com/doc/refman/8.0/en/create-role.html
- MySQL 8.0 Reference Manual: SET ROLE — https://dev.mysql.com/doc/refman/8.0/en/set-role.html
- MySQL 8.0 Reference Manual: SET DEFAULT ROLE — https://dev.mysql.com/doc/refman/8.0/en/set-default-role.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual: TRUNCATE TABLE — https://dev.mysql.com/doc/refman/8.0/en/truncate-table.html
- MySQL 8.0 Reference Manual: mandatory_roles system variable — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_mandatory_roles

## Issues Found
1. **Invalid `TRUNCATE` privilege in GRANT statement**: The post used `GRANT TRUNCATE ON myapp.* TO 'senior_writer'`, but MySQL has no `TRUNCATE` privilege. The `TRUNCATE TABLE` statement requires the `DROP` privilege. Changed to `GRANT DROP ON myapp.* TO 'senior_writer'` with a clarifying comment.

2. **Non-existent `information_schema.applicable_roles` view**: The post queried `SELECT * FROM information_schema.applicable_roles`, but this view does not exist in MySQL 8. It is a PostgreSQL concept. Replaced with `SELECT * FROM mysql.default_roles`, which is the correct MySQL system table for viewing default role assignments.

## Review Notes
- All other SQL syntax (`CREATE ROLE`, `GRANT ... TO`, `SET ROLE`, `SET DEFAULT ROLE`, `REVOKE ... FROM`, `DROP ROLE`, `SHOW GRANTS ... USING`, `mysql.role_edges`, `mandatory_roles`) is correct per MySQL 8.0 documentation.
- The explanation that roles must be activated before they take effect is accurate and an important MySQL-specific detail that distinguishes it from other DBMS role implementations.
- The `mandatory_roles` my.cnf example uses `role@%` format with quotes, which is acceptable.

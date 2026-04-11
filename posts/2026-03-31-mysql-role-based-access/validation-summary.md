# Validation Summary: How to Set Up MySQL Role-Based Access Control

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Role-Based Access Control (RBAC)
- MySQL privilege system
- MySQL configuration (`mysqld.cnf`)

## Sources Consulted
- MySQL 8.0 Reference Manual: Roles — https://dev.mysql.com/doc/refman/8.0/en/roles.html
- MySQL 8.0 Reference Manual: CREATE ROLE — https://dev.mysql.com/doc/refman/8.0/en/create-role.html
- MySQL 8.0 Reference Manual: SET ROLE — https://dev.mysql.com/doc/refman/8.0/en/set-role.html
- MySQL 8.0 Reference Manual: ALTER USER DEFAULT ROLE — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: SHOW GRANTS — https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual: Server System Variables (activate_all_roles_on_login, mandatory_roles) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: mysql.role_edges Table — https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html

## Issues Found
1. **DEFAULT ROLE referenced an ungranted role**: `ALTER USER 'charlie'@'%' DEFAULT ROLE 'app_admin', 'db_backup';` would fail because `db_backup` was never granted to charlie. In MySQL, a role must be granted to a user before it can be set as a default role, otherwise ERROR 3530 is raised. Fixed by changing the earlier grant statement from `GRANT 'app_admin' TO 'charlie'@'%'` to `GRANT 'app_admin', 'db_backup' TO 'charlie'@'%'` so that charlie has both roles before the DEFAULT ROLE statement.

## Review Notes
- The backup role privileges (`SELECT, SHOW VIEW, RELOAD, REPLICATION CLIENT, EVENT, LOCK TABLES, TRIGGER`) are a reasonable set for mysqldump-based backups but may need `PROCESS` added depending on backup options (e.g., `--single-transaction`). This is context-dependent rather than incorrect.
- The comment "roles are like user accounts with no host or password" is a simplification. Internally, MySQL stores roles as locked user accounts with a default host of `%`. This is acceptable for a tutorial-level explanation.
- The "Assigning Roles to Users" section grants `app_readwrite` to alice on line 80, then grants both `app_readonly` and `app_readwrite` again on line 87. The redundant `app_readwrite` grant is harmless (MySQL ignores duplicate grants) and serves to demonstrate multi-role grant syntax, so this is acceptable.
- All SQL syntax (`CREATE ROLE`, `GRANT ... TO`, `SET ROLE`, `REVOKE ... FROM`, `DROP ROLE`, `SHOW GRANTS ... USING`) is correct for MySQL 8.0.
- The `mysql.role_edges` query correctly references `FROM_USER`, `TO_USER`, and `TO_HOST` columns.
- Configuration directives `activate_all_roles_on_login` and `mandatory_roles` are valid MySQL 8.0 server system variables with correct syntax shown.

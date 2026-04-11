# Validation Summary: How to Set Default Roles in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Role-Based Access Control (RBAC)
- SQL (SET DEFAULT ROLE, ALTER USER, GRANT, CREATE USER)
- MySQL system variables (activate_all_roles_on_login)

## Sources Consulted
- MySQL 8.0 Reference Manual — SET DEFAULT ROLE Statement: https://dev.mysql.com/doc/refman/8.0/en/set-default-role.html
- MySQL 8.0 Reference Manual — ALTER USER Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual — GRANT Statement: https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual — Grant Tables (mysql.default_roles): https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html
- MySQL 8.0 Reference Manual — Server System Variables (activate_all_roles_on_login): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_activate_all_roles_on_login
- MySQL 8.0 Reference Manual — CURRENT_ROLE(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_current-role

## Issues Found

1. **Incorrect claim about `SET DEFAULT ROLE ALL` and future grants (line 43):** The post stated that `SET DEFAULT ROLE ALL` "activates every role currently granted to Carol, including any roles granted in the future." This is wrong — `ALL` applies only to roles granted at the time the statement is executed. New roles granted later require re-running the command. Fixed to clarify this and point to `activate_all_roles_on_login` as the alternative for automatic coverage of future grants.

2. **Non-existent `default_role` column in `mysql.user` table (lines 64-67):** The post queried `SELECT user, host, default_role FROM mysql.user` — but the `mysql.user` table has no `default_role` column. Default role mappings are stored in the `mysql.default_roles` grant table. Removed this incorrect query entirely.

3. **Non-existent `information_schema.DEFAULT_ROLES` table (lines 71-76):** The post queried `information_schema.DEFAULT_ROLES`, which does not exist in MySQL. The correct table is `mysql.default_roles` with columns USER, HOST, DEFAULT_ROLE_USER, and DEFAULT_ROLE_HOST. Fixed to use the correct table.

4. **Incorrect precedence claim for `activate_all_roles_on_login` (line 109):** The post claimed "`SET DEFAULT ROLE` per user takes precedence" over the global variable. This is backwards — when `activate_all_roles_on_login = ON`, all granted roles are activated at login regardless of per-user `SET DEFAULT ROLE` settings. The global variable overrides per-user defaults. Fixed to accurately describe this behavior.

## Review Notes
- The SQL syntax for `SET DEFAULT ROLE`, `ALTER USER ... DEFAULT ROLE`, `GRANT ... TO`, `SET DEFAULT ROLE NONE`, and `SET DEFAULT ROLE ALL` is correct per MySQL 8.0 documentation.
- The `CURRENT_ROLE()` function and its output format with backtick-quoted role names are accurate.
- The `my.cnf` configuration snippet for `activate_all_roles_on_login` is correct.
- The post correctly notes that roles must be granted before they can be set as defaults.
- The post correctly shows that `SET DEFAULT ROLE` can target multiple users in a single statement.

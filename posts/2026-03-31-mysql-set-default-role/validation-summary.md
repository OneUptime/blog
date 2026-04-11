# Validation Summary: How to Use SET DEFAULT ROLE Statement in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+
- MySQL Role-Based Access Control (RBAC)
- SET DEFAULT ROLE statement
- ALTER USER ... DEFAULT ROLE syntax
- mysql.default_roles system table
- activate_all_roles_on_login server variable

## Sources Consulted
- MySQL 8.0 Reference Manual — SET DEFAULT ROLE: https://dev.mysql.com/doc/refman/8.0/en/set-default-role.html
- MySQL 8.0 Reference Manual — ALTER USER: https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual — Grant Tables (mysql.default_roles): https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html
- MySQL 8.0 Reference Manual — activate_all_roles_on_login: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_activate_all_roles_on_login
- MySQL 8.0 Reference Manual — SHOW CREATE USER: https://dev.mysql.com/doc/refman/8.0/en/show-create-user.html

## Issues Found
- **"ALTER USER is preferred" claim (line 122):** The post stated "`ALTER USER` is preferred in MySQL 8 for consistency with other user management operations." This is editorial opinion not supported by official MySQL documentation. Neither form is officially preferred — they have different capabilities: `ALTER USER` supports `CURRENT_USER` syntax, while `SET DEFAULT ROLE` can target multiple users in one statement. Reworded to accurately describe the trade-offs.

## Review Notes
- All SQL syntax examples (SET DEFAULT ROLE with single role, multiple roles, ALL, NONE, and multiple users) are correct per the official MySQL 8.0 documentation.
- The mysql.default_roles column names (User, Host, default_role_user, default_role_host) are correct. MySQL column names are case-insensitive so the mixed-case usage is fine.
- The CURRENT_ROLE() output format shown (`` `app_reader`@`%` `` with backticks) is accurate.
- The activate_all_roles_on_login variable usage and behavior are correctly described.
- The practical setup example is a complete, working workflow with correct syntax throughout.
- The post does not mention required privileges for SET DEFAULT ROLE (requires CREATE USER privilege or UPDATE on mysql.default_roles for other users' accounts, no special privilege for your own account). This is an omission but not an error.

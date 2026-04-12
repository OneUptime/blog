# Validation Summary: How to Configure MySQL Component Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0+
- MySQL Component Infrastructure
- MySQL Plugin System (legacy comparison)
- `INSTALL COMPONENT` / `UNINSTALL COMPONENT` SQL statements
- `SET PERSIST` for persistent configuration
- `mysql.component` system table
- `performance_schema.global_variables` and `performance_schema.persisted_variables`

## Sources Consulted
- MySQL 8.0 Reference Manual: MySQL Server Component Infrastructure — https://dev.mysql.com/doc/refman/8.0/en/server-component-installation.html
- MySQL 8.0 Reference Manual: INSTALL COMPONENT Statement — https://dev.mysql.com/doc/refman/8.0/en/install-component.html
- MySQL 8.0 Reference Manual: UNINSTALL COMPONENT Statement — https://dev.mysql.com/doc/refman/8.0/en/uninstall-component.html
- MySQL 8.0 Reference Manual: SET PERSIST — https://dev.mysql.com/doc/refman/8.0/en/set-variable.html
- MySQL 8.0 Reference Manual: Keyring Component Installation — https://dev.mysql.com/doc/refman/8.0/en/keyring-component-installation.html
- MySQL 8.0 Reference Manual: Password Validation Component — https://dev.mysql.com/doc/refman/8.0/en/validate-password.html

## Issues Found

1. **Misleading `performance_schema.host_cache` query**: The "Listing Available and Installed Components" section included a query `SELECT * FROM performance_schema.host_cache LIMIT 0;` with the comment "View component services provided." The `host_cache` table contains DNS host cache information and has nothing to do with component services. Removed this misleading query and kept only the relevant queries (`mysql.component` and `plugin_dir`).

2. **Incorrect keyring component installation method**: The post showed `INSTALL COMPONENT 'file://component_keyring_file';` as a regular INSTALL COMPONENT example. Starting with MySQL 8.0.24, keyring components must be loaded via a server manifest file (e.g., `mysqld.my`), not via the `INSTALL COMPONENT` SQL statement. This is because keyring functionality needs to be available early in the server startup process before general components are loaded. Replaced the example with `component_log_filter_dragnet` and added a note about keyring components requiring manifest-based loading.

3. **Misleading plugin examples in comparison table**: InnoDB and MyISAM were listed as plugin examples. While they are technically implemented as storage engine plugins internally, they are built-in engines and not installed via `INSTALL PLUGIN`. Replaced with more representative installable plugin examples: `validate_password` (plugin version), `clone`, and `audit_log`.

## Review Notes
- The `SET PERSIST` path `/var/lib/mysql/mysqld-auto.cnf` is correct for the default Linux data directory but is actually `<datadir>/mysqld-auto.cnf`. This is acceptable as a typical example but readers on non-default installations should be aware.
- The post correctly distinguishes between the component variable naming convention (dot notation: `validate_password.policy`) versus the plugin variable naming convention (underscore: `validate_password_policy`).
- The overall architecture explanation of components vs. plugins is accurate and well-presented.

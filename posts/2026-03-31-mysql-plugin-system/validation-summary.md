# Validation Summary: How to Configure MySQL Plugin System

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL Server (5.7 and 8.0+)
- MySQL Plugin System (INSTALL PLUGIN, UNINSTALL PLUGIN)
- MySQL Component Infrastructure (referenced for comparison)
- MySQL configuration (my.cnf / plugin-load-add)
- connection_control plugin
- validate_password plugin

## Sources Consulted
- MySQL 8.0 Reference Manual: The MySQL Plugin API — https://dev.mysql.com/doc/refman/8.0/en/plugin-api.html
- MySQL 8.0 Reference Manual: INSTALL PLUGIN Statement — https://dev.mysql.com/doc/refman/8.0/en/install-plugin.html
- MySQL 8.0 Reference Manual: Server Plugin Loading — https://dev.mysql.com/doc/refman/8.0/en/server-plugin-loading.html
- MySQL 8.0 Reference Manual: Password Validation Options and Variables — https://dev.mysql.com/doc/refman/8.0/en/validate-password-options-variables.html
- MySQL 8.0 Reference Manual: Connection Control Plugin Reference — https://dev.mysql.com/doc/refman/8.0/en/connection-control-variables.html
- MySQL 8.0 Reference Manual: MySQL Components — https://dev.mysql.com/doc/refman/8.0/en/components.html

## Issues Found
1. **validate_password variable naming (lines 90, 97):** The post installed `validate_password` as a **plugin** (via `INSTALL PLUGIN validate_password SONAME 'validate_password.so'`) but then used the component-style dot-notation variable name `validate_password.policy`. When using the plugin version, variables use underscores (e.g., `validate_password_policy`). The dot notation (`validate_password.policy`) is only correct when the component version is installed via `INSTALL COMPONENT 'file://component_validate_password'`. Fixed both `SET GLOBAL` and `SET PERSIST` examples to use `validate_password_policy` instead of `validate_password.policy`.

## Review Notes
- The `ldap_auth` name in the Plugin Types list is an informal shorthand; the actual MySQL Enterprise plugin names are `authentication_ldap_simple` and `authentication_ldap_sasl`. Since this is a category overview and not an installation guide for LDAP auth, the informal name is acceptable but readers should consult the docs for exact plugin names.
- UDFs are listed as a plugin type, but in MySQL they use `CREATE FUNCTION ... SONAME` rather than `INSTALL PLUGIN`. Some plugins do register functions during initialization, so the grouping is loosely correct but could be clearer.
- The plugin directory path `/usr/lib/mysql/plugin/` in the troubleshooting section is a common default but varies by platform and installation method. This is fine as an example.
- All SQL syntax (`SHOW PLUGINS`, `INSTALL PLUGIN`, `UNINSTALL PLUGIN`, `SET PERSIST`, `information_schema.PLUGINS` queries) is correct.
- The `my.cnf` configuration examples (`plugin-load-add`, `plugin-load` with semicolon-separated values) are correct.
- The Plugin vs Component decision guide is reasonable and accurate advice for MySQL 8.0 deployments.

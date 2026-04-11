# Validation Summary: How to Manage MySQL Plugins

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7 and 8.0)
- MySQL Plugin System (INSTALL PLUGIN, SHOW PLUGINS, information_schema.PLUGINS)
- MySQL 8.0 Component System (INSTALL COMPONENT, mysql.component table)
- MySQL server configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual: The MySQL Plugin API — https://dev.mysql.com/doc/refman/8.0/en/plugin-api.html
- MySQL 8.0 Reference Manual: INSTALL PLUGIN Statement — https://dev.mysql.com/doc/refman/8.0/en/install-plugin.html
- MySQL 8.0 Reference Manual: INSTALL COMPONENT Statement — https://dev.mysql.com/doc/refman/8.0/en/install-component.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA PLUGINS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-plugins-table.html
- MySQL 8.0 Reference Manual: Password Validation Component/Plugin — https://dev.mysql.com/doc/refman/8.0/en/validate-password.html
- MySQL 8.0 Reference Manual: Server Plugin Loading — https://dev.mysql.com/doc/refman/8.0/en/server-plugin-loading.html

## Issues Found

1. **Plugin Types table: validate_password miscategorized as AUDIT type.** The `validate_password` plugin was listed as an example of the `AUDIT` plugin type, but its actual PLUGIN_TYPE in MySQL is `VALIDATE PASSWORD`. Moved `validate_password` to its own `VALIDATE PASSWORD` row and left `audit_log` as the sole AUDIT example.

2. **Plugin Types table: X Plugin miscategorized as INFORMATION SCHEMA type.** "X Plugin tables" was listed under the `INFORMATION SCHEMA` plugin type, but X Plugin (mysqlx) is a `DAEMON` type plugin. Changed the INFORMATION SCHEMA examples to "InnoDB buffer, compression tables" (which are actual INFORMATION SCHEMA type plugin entries) and moved X Plugin to the DAEMON row.

3. **Plugin vs. component variable naming conflated.** The "Configuring Plugin Behavior" section used dot-separated variable names (`validate_password.policy`, `validate_password.length`) which only apply to the MySQL 8.0 component version (installed via `INSTALL COMPONENT`). The plugin version (installed via `INSTALL PLUGIN`) uses underscore-separated names (`validate_password_policy`, `validate_password_length`). Added both forms with clear labels indicating which applies to the plugin and which to the component.

## Review Notes
- The post description mentions "uninstall" but the post does not cover `UNINSTALL PLUGIN` or `UNINSTALL COMPONENT` statements. This is a content gap, not a technical error.
- The `validate_password` plugin is deprecated in MySQL 8.0 in favor of the `component_validate_password` component. The post mentions both but does not explicitly note the deprecation.
- The `audit_log` plugin is only available in MySQL Enterprise Edition, which was noted in the corrected table.

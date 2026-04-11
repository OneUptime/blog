# Validation Summary: How to Use SHOW PLUGINS in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (8.0+)
- SHOW PLUGINS statement
- INFORMATION_SCHEMA.PLUGINS table
- MySQL plugin and component architecture
- INSTALL PLUGIN / INSTALL COMPONENT syntax

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW PLUGINS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-plugins.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA PLUGINS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-plugins-table.html)
- MySQL 8.0 Reference Manual: INSTALL PLUGIN Statement (https://dev.mysql.com/doc/refman/8.0/en/install-plugin.html)
- MySQL 8.0 Reference Manual: INSTALL COMPONENT Statement (https://dev.mysql.com/doc/refman/8.0/en/install-component.html)
- MySQL 8.0 Reference Manual: The Password Validation Component (https://dev.mysql.com/doc/refman/8.0/en/validate-password.html)
- MySQL 8.0 Reference Manual: Server Plugin Types (https://dev.mysql.com/doc/refman/8.0/en/plugin-types.html)

## Issues Found

1. **validate_password Library value in example output**: The Library column for `validate_password` was shown as `component_validate_password`. This is incorrect. In MySQL, plugins and components are separate systems. The `component_validate_password` component (installed via `INSTALL COMPONENT`) does NOT appear in `SHOW PLUGINS` output — only the plugin version does, with library `validate_password.so`. Fixed the Library value to `validate_password.so`.

2. **Incorrect plugin type `FULL TEXT`**: The Type column description listed `FULL TEXT` as a plugin type. MySQL uses `FTPARSER` for full-text parser plugins in the Type column of `SHOW PLUGINS` output. Changed `FULL TEXT` to `FTPARSER`.

## Review Notes
- The `audit_log` plugin used in the INSTALL PLUGIN example is an Enterprise Edition plugin. The post already includes a note at the top clarifying this, which is appropriate.
- The `sha256_password` plugin shown as ACTIVE in the example output was deprecated in MySQL 8.0.34 and removed in MySQL 8.4/9.0. The example is still valid for earlier MySQL 8.0 versions.
- The `validate_password` plugin itself is deprecated in favor of the `component_validate_password` component in MySQL 8.0+. The post correctly covers both the plugin and component installation methods, but readers should be aware that the component is the recommended approach.
- The disabling syntax `mysql_native_password=OFF` in my.cnf is correct for MySQL 8.0+.

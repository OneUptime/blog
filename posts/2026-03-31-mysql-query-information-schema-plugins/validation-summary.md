# Validation Summary: How to Query INFORMATION_SCHEMA.PLUGINS in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.PLUGINS table
- MySQL plugin system (INSTALL PLUGIN / UNINSTALL PLUGIN)
- MySQL validate_password plugin

## Sources Consulted
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA PLUGINS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-plugins-table.html
- MySQL 8.0 Reference Manual: INSTALL PLUGIN Statement — https://dev.mysql.com/doc/refman/8.0/en/install-plugin.html
- MySQL 8.0 Reference Manual: Server Plugin Loading — https://dev.mysql.com/doc/refman/8.0/en/plugin-loading.html
- MySQL 8.0 Reference Manual: SHOW PLUGINS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-plugins.html

## Issues Found
1. **`PLUGIN_STATUS` value `DELETED` corrected to `DELETING`**: The post listed the possible values for PLUGIN_STATUS as `ACTIVE`, `INACTIVE`, `DISABLED`, or `DELETED`. Per MySQL documentation, the correct value is `DELETING`, not `DELETED`. Fixed in the column description.

2. **`PLUGIN_TYPE` example `FULL-TEXT PARSER` corrected to `FTPARSER`**: The post listed `FULL-TEXT PARSER` as an example PLUGIN_TYPE value. MySQL actually reports this type as `FTPARSER`. Fixed in the column description.

3. **`LOAD_OPTION` missing `FORCE_PLUS_PERMANENT` value**: The post listed only `ON`, `OFF`, `FORCE` as possible values for LOAD_OPTION, but omitted `FORCE_PLUS_PERMANENT`, which is a valid and important load option that prevents a plugin from being uninstalled at runtime. Added the missing value.

## Review Notes
- The post correctly notes that MySQL 8.0+ ships validate_password as a component rather than a plugin. Users on MySQL 8.0+ should prefer `INSTALL COMPONENT 'file://component_validate_password'` over the `INSTALL PLUGIN` syntax shown.
- All SQL queries are syntactically correct and use valid column names from the INFORMATION_SCHEMA.PLUGINS table.
- The CASE expression for distinguishing built-in vs dynamic plugins is correct — built-in plugins do have NULL for PLUGIN_LIBRARY.

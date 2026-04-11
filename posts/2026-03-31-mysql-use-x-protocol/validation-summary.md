# Validation Summary: How to Use MySQL X Protocol

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL X Protocol
- MySQL X Plugin
- MySQL Shell (mysqlsh)
- Node.js @mysql/xdevapi connector
- Python mysql-connector-python (mysqlx module)
- MySQL server configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual — X Plugin: https://dev.mysql.com/doc/refman/8.0/en/x-plugin.html
- MySQL 8.0 Reference Manual — Checking X Plugin Installation: https://dev.mysql.com/doc/refman/8.0/en/x-plugin-checking-installation.html
- MySQL 8.0 Reference Manual — Disabling X Plugin: https://dev.mysql.com/doc/refman/8.0/en/x-plugin-disabling.html
- MySQL 5.7 Release Notes (5.7.12): https://dev.mysql.com/doc/relnotes/mysql/5.7/en/news-5-7-12.html
- MySQL Connector/Python X DevAPI Session reference: https://dev.mysql.com/doc/dev/connector-python/latest/mysqlx.Session.html
- MySQL Connector/Node.js tutorial — Connecting to a Server: https://dev.mysql.com/doc/dev/connector-nodejs/latest/tutorial-Connecting_to_a_Server.html

## Issues Found

1. **SHOW PLUGINS output showed `mysqlx.so` for Library column**: In MySQL 8.0+, the X Plugin is built into the server binary, so the Library column shows `NULL`, not `mysqlx.so`. Fixed the expected output to show `NULL` and added a note explaining the difference between MySQL 5.7 and 8.0+.

2. **`INSTALL PLUGIN mysqlx SONAME 'mysqlx.so'` command**: This command only works on MySQL 5.7, where the X Plugin was a loadable plugin. In MySQL 8.0+, the plugin is built-in and enabled by default — it cannot be installed via `INSTALL PLUGIN`. Removed the command and updated the section to explain that in MySQL 8.0+ the plugin is built-in and can be re-enabled via configuration.

3. **`UNINSTALL PLUGIN mysqlx` command**: Similarly, built-in plugins in MySQL 8.0+ cannot be uninstalled with `UNINSTALL PLUGIN`. Replaced with the correct approach: passing `--mysqlx=0` as a startup flag.

4. **Summary grammar**: "Enable it by default on MySQL 8.0" was grammatically awkward as an imperative. Changed to "It is enabled by default on MySQL 8.0" for clarity.

## Review Notes
- MySQL 5.7 reached end of life in October 2023. The post now correctly targets MySQL 8.0+ behavior, which is appropriate for a 2026 publication date.
- The Node.js code example uses top-level `await` without wrapping in an `async` function. This is a common documentation shorthand and works with ES modules in Node.js 14.8+, so no change was made.
- The Python and Node.js code examples use hardcoded credentials (`root`/`secret`), which is standard for tutorial examples but should not be used in production.

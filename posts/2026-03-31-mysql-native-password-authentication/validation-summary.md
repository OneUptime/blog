# Validation Summary: How to Use mysql_native_password Authentication in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7, 8.0, 8.4, 9.0)
- mysql_native_password authentication plugin
- caching_sha2_password authentication plugin
- MySQL server configuration (my.cnf)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables (`default_authentication_plugin`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_authentication_plugin
- MySQL 8.0 Reference Manual — Native Pluggable Authentication: https://dev.mysql.com/doc/refman/8.0/en/native-pluggable-authentication.html
- MySQL 8.4 Reference Manual — Native Pluggable Authentication: https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html
- MySQL 8.0 Reference Manual — CREATE USER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual — ALTER USER Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 9.0 Release Notes (mysql_native_password removal)

## Issues Found

1. **`SET GLOBAL default_authentication_plugin` is invalid** — The post claimed you could dynamically set this variable at runtime with `SET GLOBAL`. However, `default_authentication_plugin` is not a dynamic variable (Dynamic: No in MySQL docs). It can only be set at server startup via the config file or command line. Fixed by replacing the SET GLOBAL example with the correct command-line startup syntax and adding a note explaining the limitation.

2. **MySQL 8.4 did not remove mysql_native_password** — The post stated "MySQL 8.4 removed mysql_native_password as an option." In reality, MySQL 8.4 only disabled the plugin by default (starting the server with `--mysql-native-password=OFF`), but it can still be re-enabled. The plugin was fully removed in MySQL 9.0. Fixed the section heading to "Deprecation and Removal" and corrected the description to accurately reflect the 8.4 (disabled by default) vs 9.0 (removed) timeline.

3. **Incorrect supported version for mysql_native_password** — The security comparison table listed "5.0+" as the supported MySQL versions for mysql_native_password. The native password hashing mechanism was introduced in MySQL 4.1 (which introduced the 41-byte password hash format). Fixed to "4.1+".

## Review Notes
- The post describes the password hash as "SHA1" which is a simplification. The actual stored hash is a double-SHA1: `SHA1(SHA1(password))`. This is acceptable for a blog post aimed at practical usage but readers should be aware of the distinction.
- The `default_authentication_plugin` variable was removed in MySQL 8.4 and replaced by `authentication_policy`. This was noted in the fix.
- PyMySQL's support for `caching_sha2_password` is correct but required version 0.9.3+. The post doesn't specify a minimum version, which is acceptable for general guidance.

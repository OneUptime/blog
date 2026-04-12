# Validation Summary: How to Configure Authentication Plugins in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0 / 8.4
- MySQL authentication plugins (caching_sha2_password, mysql_native_password, sha256_password, auth_socket, mysql_no_login)
- MySQL server configuration (my.cnf)
- systemd service management

## Sources Consulted
- MySQL 8.0 Reference Manual — Pluggable Authentication: https://dev.mysql.com/doc/refman/8.0/en/pluggable-authentication.html
- MySQL 8.0 Reference Manual — caching_sha2_password: https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html
- MySQL 8.0 Reference Manual — mysql_native_password deprecation: https://dev.mysql.com/doc/refman/8.0/en/mysql-native-password.html
- MySQL 8.0 Reference Manual — sha256_password: https://dev.mysql.com/doc/refman/8.0/en/sha256-pluggable-authentication.html
- MySQL 8.4 Reference Manual — authentication_policy: https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_authentication_policy
- MySQL 8.0 Release Notes (8.0.34) — deprecation notices for mysql_native_password, sha256_password, and default_authentication_plugin

## Issues Found

1. **`mysql_native_password` deprecation version was incorrect.** The post stated "deprecated in 8.4" but it was actually deprecated as of MySQL 8.0.34. In MySQL 8.4, the plugin is disabled by default (not loaded). Fixed the table entry to read "deprecated as of 8.0.34, disabled by default in 8.4".

2. **`sha256_password` deprecation not mentioned.** The table described sha256_password as "SHA256 without caching; slower than caching_sha2" without noting that it is also deprecated (as of 8.0.34) and disabled by default in 8.4. This was inconsistent with the mysql_native_password entry which did mention deprecation. Fixed to include deprecation information.

3. **`default_authentication_plugin` variable is deprecated/removed.** The post used `default_authentication_plugin` in the my.cnf configuration without noting that this variable was deprecated in MySQL 8.0.34 and removed entirely in MySQL 8.4. Added a note about the deprecation and the replacement variable `authentication_policy` for MySQL 8.4+, along with the corresponding SHOW VARIABLES query.

## Review Notes
- All SQL syntax (CREATE USER, ALTER USER, SELECT from mysql.user and information_schema.PLUGINS) is correct.
- The `--get-server-public-key` and `--server-public-key-path` client options are correctly documented.
- The auth_socket and mysql_no_login plugin descriptions and usage examples are accurate.
- The comment that the first `--get-server-public-key` connection is insecure (MITM risk over unencrypted channel) is technically accurate.
- The post focuses on MySQL 8.0 but now correctly notes where MySQL 8.4 diverges, which is important given 8.4 is the current LTS release.

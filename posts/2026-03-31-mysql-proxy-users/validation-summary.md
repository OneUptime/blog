# Validation Summary: How to Use Proxy Users in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (proxy user authentication, GRANT PROXY, server-side proxy mapping)
- mysql_no_login authentication plugin
- mysql_native_password authentication plugin
- authentication_ldap_simple (MySQL Enterprise)

## Sources Consulted
- MySQL 8.0 Reference Manual: Proxy Users — https://dev.mysql.com/doc/refman/8.0/en/proxy-users.html
- MySQL 8.0 Reference Manual: Server-Side Proxy User Mapping — https://dev.mysql.com/doc/refman/8.0/en/proxy-users.html#proxy-users-server-support
- MySQL 8.0 Reference Manual: No-Login Pluggable Authentication — https://dev.mysql.com/doc/refman/8.0/en/no-login-pluggable-authentication.html
- MySQL 8.0 Reference Manual: GRANT PROXY — https://dev.mysql.com/doc/refman/8.0/en/grant.html#grant-proxy
- MySQL 8.0 Reference Manual: Information Functions (USER(), CURRENT_USER()) — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html

## Issues Found

1. **Missing server-side proxy mapping configuration (critical)**: The post used `mysql_native_password` for the proxy account but did not mention that `check_proxy_users` and `mysql_native_password_proxy_users` system variables must be enabled for server-side proxy mapping to work. Without these, MySQL does not perform proxy mapping for `mysql_native_password`-authenticated users, and the examples would not produce the described behavior. Added `SET GLOBAL check_proxy_users = ON` and `SET GLOBAL mysql_native_password_proxy_users = ON` after the GRANT PROXY statement.

2. **Incorrect `USER()` output**: The example output showed `alice@%` for `USER()`, but `USER()` returns the actual connecting hostname (e.g., `alice@localhost`), not the account definition wildcard `%`. Changed to `alice@localhost`.

3. **Missing `mysql_no_login` plugin installation**: The `mysql_no_login` plugin is not loaded by default in MySQL. The post used `IDENTIFIED WITH mysql_no_login` without noting that the plugin must first be installed. Added `INSTALL PLUGIN mysql_no_login SONAME 'mysql_no_login.so'` before the CREATE USER statement.

4. **Text inconsistency in PAM/LDAP section**: The section heading says "PAM or LDAP" but the introductory text said "via PAM" while the actual example uses `authentication_ldap_simple` (LDAP). Changed "via PAM" to "via LDAP" to match the example.

## Review Notes
- `mysql_native_password` is deprecated as of MySQL 8.0.34 and removed in MySQL 9.0. The default authentication plugin in MySQL 8.0+ is `caching_sha2_password`. The post may want to note this or update examples to use `caching_sha2_password` (which has its own proxy variable: `sha256_password_proxy_users` is for `sha256_password`; `caching_sha2_password` supports server-side proxy mapping via `check_proxy_users` alone in recent versions).
- The anonymous user catch-all example (`''@'%'`) also requires the proxy mapping system variables to be enabled, which is now implied by the earlier configuration but could be called out explicitly for clarity.
- An alternative to the `mysql_no_login` plugin for preventing direct login is `ACCOUNT LOCK` (available since MySQL 5.7.6), which does not require installing a separate plugin.

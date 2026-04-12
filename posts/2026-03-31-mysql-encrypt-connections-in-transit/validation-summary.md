# Validation Summary: How to Encrypt MySQL Connections in Transit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7 / 8.0)
- SSL/TLS encryption for database connections
- OpenSSL (certificate generation)
- `mysql_ssl_rsa_setup` utility
- Node.js with `mysql2` driver
- Python with `mysql-connector-python`
- MySQL Performance Schema and `sys` schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Configuring MySQL to Use Encrypted Connections — https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html
- MySQL 8.0 Reference Manual: `mysql_ssl_rsa_setup` — https://dev.mysql.com/doc/refman/8.0/en/mysql-ssl-rsa-setup.html
- MySQL 8.0 Reference Manual: CREATE USER TLS Options — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: Grant Tables (`mysql.user` columns) — https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html
- MySQL 8.0 Reference Manual: `sys.session_ssl_status` View — https://dev.mysql.com/doc/refman/8.0/en/sys-session-ssl-status.html
- MySQL Connector/Python Connection Arguments — https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html
- mysql2 Node.js SSL Documentation — https://sidorares.github.io/node-mysql2/docs/documentation/ssl

## Issues Found

### 1. Misleading comment on `mysql.user` query
- **What was wrong:** The comment said "Check current connections using TLS" but the query `SELECT ... FROM mysql.user WHERE ssl_type != ''` checks which users have TLS *requirements* configured (via `REQUIRE SSL`, `REQUIRE X509`, etc.), not which connections are currently encrypted.
- **What was changed:** Updated the comment to "Check which users require TLS" to accurately describe what the query returns.

### 2. Incorrect query for checking live connection TLS status
- **What was wrong:** The query `SELECT * FROM performance_schema.session_status WHERE VARIABLE_NAME = 'Ssl_cipher'` only shows the TLS cipher for the *current* session, not all live connections. The comment said "Check live connections" (plural), which is misleading.
- **What was changed:** Replaced with `SELECT * FROM sys.session_ssl_status;` which is a purpose-built view that shows `thread_id`, `ssl_version`, `ssl_cipher`, and `ssl_sessions_reused` for all active connections.

## Review Notes
- `mysql_ssl_rsa_setup` was deprecated in MySQL 8.0.34 and removed in MySQL 8.4.0. The recommended alternative for newer versions is MySQL's automatic certificate generation at startup via `auto_generate_certs` (enabled by default). The post should add a note about this if updated for MySQL 8.4+.
- `SHOW VARIABLES LIKE 'have_ssl'` was deprecated in MySQL 8.0.26 and removed in MySQL 8.4.0. For MySQL 8.4+, use `performance_schema.tls_channel_status` instead.
- `FLUSH PRIVILEGES` after `ALTER USER` is unnecessary (ALTER USER takes effect immediately) but not harmful. Left as-is since it's a common convention and not technically incorrect.
- The opening statement "MySQL sends data over the network in plaintext" is broadly true for older defaults, but MySQL 8.0+ clients default to `--ssl-mode=PREFERRED` which attempts TLS automatically. The post's advice to explicitly configure and enforce TLS is still correct and important regardless.
- OpenSSL commands, server configuration variables, CLI flags, Node.js mysql2 API, and Python mysql-connector-python API were all verified as correct.

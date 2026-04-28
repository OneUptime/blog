# Validation Summary: How to Configure MySQL SSL/TLS for Encrypted IPv4 Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- SSL/TLS (TLSv1.2, TLSv1.3)
- OpenSSL (certificate generation)
- `mysql_ssl_rsa_setup` utility
- MySQL user account management (`CREATE USER`, `ALTER USER`, `REQUIRE SSL`, `REQUIRE CIPHER`)
- mysql client SSL options
- systemd service management

## Sources Consulted
- MySQL Reference Manual — `mysql_ssl_rsa_setup`: https://dev.mysql.com/doc/refman/8.0/en/mysql-ssl-rsa-setup.html
- MySQL Reference Manual — Connection options (`--ssl-mode`, `--ssl-ca`, etc.): https://dev.mysql.com/doc/refman/8.0/en/connection-options.html
- MySQL Reference Manual — Server system variables (`have_ssl`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL Reference Manual — Option files: https://dev.mysql.com/doc/refman/8.0/en/option-files.html
- MySQL Reference Manual — `CREATE USER`: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL Reference Manual — Encrypted connection protocols and ciphers: https://dev.mysql.com/doc/refman/8.0/en/encrypted-connection-protocols-ciphers.html
- MySQL Reference Manual — Privilege changes: https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html

## Issues Found
No technical issues found.

All commands, configuration syntax, and SQL statements were verified against official MySQL 8.0 documentation:
- OpenSSL certificate generation commands are correct
- Server config options (`ssl-ca`, `ssl-cert`, `ssl-key`) accept hyphens or underscores interchangeably
- `tls_version = TLSv1.2,TLSv1.3` is the correct comma-separated format
- `CREATE USER ... REQUIRE SSL` and `ALTER USER ... REQUIRE CIPHER` syntax is correct
- `ECDHE-RSA-AES128-GCM-SHA256` is a valid permitted cipher name
- mysql client `--ssl-ca`, `--ssl-cert`, `--ssl-key` options remain valid (not deprecated)
- `SHOW STATUS LIKE 'Ssl_cipher'` and `\s` verification commands are correct
- The example IPs (203.0.113.10 from RFC 5737 TEST-NET-3) are appropriate for documentation

## Review Notes

A few non-blocking observations worth noting for future updates, but none rise to the level of technical errors that warrant editing the post:

- **`mysql_ssl_rsa_setup` is deprecated as of MySQL 8.0.34.** The utility still works and ships with current 8.0 releases, so the post's instructions are functional. The recommended modern path is to let the server auto-generate certificates at first startup (default behavior since 5.7.6/8.0), or use OpenSSL directly (which the post also covers as the alternative). If MySQL eventually removes the utility, this section will need updating.

- **`have_ssl` server variable is deprecated as of MySQL 8.0.26.** It still returns `YES`/`DISABLED`/`NO` and is supported, but `performance_schema.tls_channel_status` is the modern alternative. The verification command in the post still works correctly.

- **`FLUSH PRIVILEGES` after `CREATE USER`/`ALTER USER` is unnecessary** — those account-management statements modify grant tables through the server's privilege system and the changes take effect immediately. Including it isn't an error (it's a no-op in this context), just superfluous.

- **TLSv1 and TLSv1.1 were removed in MySQL 8.0.28**, so the post's `tls_version = TLSv1.2,TLSv1.3` setting matches what's allowed in modern 8.0 versions anyway.

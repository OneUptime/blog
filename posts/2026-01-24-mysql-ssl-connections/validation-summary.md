# Validation Summary: How to Configure MySQL SSL Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL SSL/TLS configuration
- MySQL client SSL modes
- OpenSSL certificate generation
- mysql_ssl_rsa_setup
- mysql-connector-python
- mysql2 for Node.js
- MySQL Connector/J
- Linux systemd and shell commands

## Sources Consulted
- MySQL Reference Manual: Configuring MySQL to Use Encrypted Connections - https://dev.mysql.com/doc/refman/9.7/en/using-encrypted-connections.html
- MySQL Reference Manual: mysql_ssl_rsa_setup - https://dev.mysql.com/doc/refman/8.0/en/mysql-ssl-rsa-setup.html
- MySQL 8.0 Security Guide: Encrypted Connection TLS Protocols and Ciphers - https://dev.mysql.com/doc/mysql-security-excerpt/8.0/en/encrypted-connection-protocols-ciphers.html
- MySQL 8.4 Reference Manual: Encrypted Connection TLS Protocols and Ciphers - https://dev.mysql.com/doc/refman/8.4/en/encrypted-connection-protocols-ciphers.html
- MySQL 8.4 Release Notes / What Is New: removed have_ssl and mysql_ssl_rsa_setup - https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html
- MySQL Connector/Python Developer Guide: Connection Arguments - https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html
- MySQL Connector/J Developer Guide: Security Properties - https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-security.html
- MySQL Connector/J Developer Guide: Connecting Securely Using SSL - https://dev.mysql.com/doc/connector-j/en/connector-j-reference-using-ssl.html
- Node.js TLS documentation - https://nodejs.org/api/tls.html

## Issues Found
- The post described `mysql_ssl_rsa_setup` as recommended for MySQL 5.7+. Updated it to clarify that it applies to MySQL 5.7 and older MySQL 8.0 releases, is deprecated as of MySQL 8.0.34, and is removed in MySQL 8.4.
- The certificate permission commands made private keys readable again by running a broad `chmod 644` after `chmod 600`. Reordered and narrowed the commands so private keys end at `600`.
- The OpenSSL-generated server certificate lacked a Subject Alternative Name, which can break `VERIFY_IDENTITY` hostname validation. Added a server certificate extension file with SAN entries and server authentication usage.
- The MySQL server cipher comments treated `ssl_cipher` as the MySQL 8.0+ cipher-suite setting. Clarified that `ssl_cipher` applies to TLSv1.2 and earlier, and added `tls_ciphersuites` for TLSv1.3.
- The MySQL 5.7 TLS example included TLSv1.1. Updated it to prefer TLSv1.2 where supported because TLSv1 and TLSv1.1 are deprecated in later MySQL 5.7 and removed in newer MySQL 8.0 releases.
- The restart verification expected `have_ssl`, which is removed in MySQL 8.4. Updated the command and notes to verify SSL paths and `tls_version` instead.
- The `mysql.user` query was labeled as checking current connection encryption and compared `user` to `CURRENT_USER()`. Updated the label and predicate so it checks SSL requirements for the authenticated account.
- The Python example could raise a `NameError` in `finally` if connection creation failed. Initialized `connection` and `cursor` before the `try` block and guarded cleanup.
- The Connector/J example used deprecated `useSSL`, `requireSSL`, and `verifyServerCertificate` properties. Replaced them with current `sslMode=VERIFY_IDENTITY`.

## Review Notes
The article remains a solid practical guide after these corrections. Future improvements could mention that production certificates should normally be issued by an internal or public CA with SANs matching the actual database hostnames used by clients.

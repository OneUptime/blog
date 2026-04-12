# Validation Summary: How to Enable SSL/TLS Connections in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0)
- SSL/TLS encryption
- OpenSSL (certificate generation)
- `mysql_ssl_rsa_setup` utility
- Mutual TLS (mTLS) with X509 client certificates

## Sources Consulted
- MySQL 8.0 Reference Manual — Using Encrypted Connections: https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html
- MySQL 8.0 Reference Manual — Creating SSL and RSA Certificates and Keys: https://dev.mysql.com/doc/refman/8.0/en/creating-ssl-rsa-files.html
- MySQL 8.0 Reference Manual — ALTER USER (REQUIRE options): https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual — Server System Variables (require_secure_transport): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_require_secure_transport
- MySQL 8.0 Reference Manual — mysql_ssl_rsa_setup: https://dev.mysql.com/doc/refman/8.0/en/mysql-ssl-rsa-setup.html

## Issues Found
1. **Incorrect description of `require_secure_transport` behavior**: The original text stated "This blocks all non-SSL connections including local Unix socket connections unless they use the socket (which is considered secure locally)." This sentence was self-contradictory — it said Unix socket connections are blocked and then immediately exempted them. Per MySQL documentation, `require_secure_transport = ON` requires SSL/TLS only for TCP/IP connections; Unix socket and shared-memory connections are always permitted because they are inherently secure. Fixed to: "This requires all TCP/IP connections to use SSL/TLS. Unix socket connections and shared-memory connections are still permitted, as they are considered inherently secure."

## Review Notes
- The `mysql_ssl_rsa_setup` utility (mentioned under the "MySQL 5.7" heading) was deprecated in MySQL 8.0.34 and removed in MySQL 9.0. The heading is not wrong (it was introduced in 5.7), but readers using MySQL 8.0.34+ should be aware it may not be available.
- The `have_openssl` and `have_ssl` server variables shown in the example output were deprecated in MySQL 8.0.26. They still function but may be removed in a future release.
- The `TLS_AES_256_GCM_SHA384` cipher shown in the `Ssl_cipher` output is a TLS 1.3 cipher suite, which is accurate for MySQL 8.0.16+ (when TLS 1.3 support was added).
- All OpenSSL commands, SQL statements, and configuration directives are syntactically correct and follow current best practices.

# Validation Summary: How to Generate SSL Certificates for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+)
- OpenSSL
- mysql_ssl_rsa_setup
- SSL/TLS certificates

## Sources Consulted
- MySQL 8.0 Reference Manual — Creating SSL and RSA Certificates and Keys: https://dev.mysql.com/doc/refman/8.0/en/creating-ssl-rsa-files.html
- MySQL 8.0 Reference Manual — mysql_ssl_rsa_setup: https://dev.mysql.com/doc/refman/8.0/en/mysql-ssl-rsa-setup.html
- MySQL 8.0 Reference Manual — Configuring MySQL to Use Encrypted Connections: https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html
- OpenSSL man pages for genrsa, req, and x509 commands

## Issues Found
1. **File permissions ordering bug**: The `chmod` commands were in the wrong order. `chmod 600 /var/lib/mysql/*-key.pem` ran first, then `chmod 644 /var/lib/mysql/*.pem` ran second. Since `*.pem` matches all `.pem` files (including `*-key.pem`), the second command overwrote the restrictive permissions on private key files, leaving them world-readable at 644. Fixed by reordering so `chmod 644` (public certs) runs before `chmod 600` (private keys), ensuring private keys end up with the correct restrictive permissions.

## Review Notes
- `mysql_ssl_rsa_setup` was deprecated in MySQL 8.0.34 and removed in MySQL 8.4. The post says "MySQL 5.7 and later," which is accurate for when the tool was introduced but could mislead readers using MySQL 8.4+. A future update could note this deprecation.
- The `-days 3650` flag on the `openssl req` commands in Steps 2 and 4 is ignored when generating a CSR (it only applies when creating a self-signed cert with `-x509`). The actual validity is controlled by `-days 3650` in the `openssl x509 -req` signing steps (Steps 3 and 5), which are correct. This is harmless and a common pattern in tutorials, so no change was made.
- The OpenSSL commands use 2048-bit RSA keys, which is still considered acceptable but 4096-bit is increasingly recommended for higher security margins in production.

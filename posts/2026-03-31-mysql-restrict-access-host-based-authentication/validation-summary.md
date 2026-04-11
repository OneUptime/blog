# Validation Summary: How to Restrict MySQL Access with Host-Based Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- MySQL user account management and authentication
- MySQL host-based access control
- SSL/TLS configuration for MySQL connections

## Sources Consulted
- MySQL 8.0 Reference Manual, Section 6.2.4 "Specifying Account Names" — https://dev.mysql.com/doc/refman/8.0/en/account-names.html
- MySQL 8.0 Reference Manual, Section 6.2.6 "Access Control, Stage 1: Connection Verification" — https://dev.mysql.com/doc/refman/8.0/en/connection-access.html
- MySQL 8.0 Reference Manual, CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual, GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual, ALTER USER Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual, Server System Variables (skip_name_resolve) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_skip_name_resolve

## Issues Found
- **`localhost` host value description was inaccurate**: The post stated that `localhost` means "(Unix socket connections only)". Per MySQL documentation, `'user'@'localhost'` matches both Unix socket connections and TCP/IP connections to the loopback address (127.0.0.1 or ::1). Changed to "(local connections via Unix socket or TCP loopback)".

## Review Notes
- The cipher example `DHE-RSA-AES256-SHA` in the REQUIRE CIPHER section is a valid OpenSSL cipher name but is a legacy TLS 1.0/1.1 cipher. Modern MySQL 8.0+ deployments typically use TLS 1.2 or 1.3 ciphers. The syntax is correct, but readers targeting current production environments may want to use a more modern cipher suite.
- The config file path `/etc/mysql/mysql.conf.d/mysqld.cnf` is specific to Debian/Ubuntu MySQL packages. Other distributions may use different paths (e.g., `/etc/my.cnf` on RHEL/CentOS). This is acceptable as a concrete example but worth noting.
- All SQL syntax (CREATE USER, GRANT, DROP USER, ALTER USER, SELECT queries) is correct and current for MySQL 8.0+.

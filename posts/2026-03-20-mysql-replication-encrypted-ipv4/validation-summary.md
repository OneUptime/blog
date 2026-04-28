# Validation Summary: How to Configure MySQL Replication with Encrypted IPv4 Connections

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- MySQL (8.0.23+ / 8.4+ replication syntax)
- TLS/SSL certificate generation with OpenSSL
- `mysql_ssl_rsa_setup` utility
- MySQL replication (primary/replica)
- IPv4 networking (`bind-address`)

## Sources Consulted
- MySQL 8.4 Reference Manual — Setting Up Replication to Use Encrypted Connections: https://dev.mysql.com/doc/refman/8.4/en/replication-encrypted-connections.html
- MySQL 8.4 Reference Manual — `CHANGE REPLICATION SOURCE TO` Statement: https://dev.mysql.com/doc/refman/8.4/en/change-replication-source-to.html
- MySQL 8.4 Reference Manual — `SHOW BINARY LOG STATUS` Statement: https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.4 Reference Manual — `CREATE USER` Statement (REQUIRE clause): https://dev.mysql.com/doc/refman/8.4/en/create-user.html
- MySQL 8.4 Reference Manual — Grant Tables (`mysql.user` `ssl_type` column): https://dev.mysql.com/doc/refman/8.4/en/grant-tables.html
- MySQL 8.4 Reference Manual — `mysql_ssl_rsa_setup` (deprecation note): https://dev.mysql.com/doc/refman/8.4/en/mysql-ssl-rsa-setup.html
- MySQL 8.4 Reference Manual — `require_secure_transport` system variable: https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_require_secure_transport

## Issues Found
- **`ssl_type` value documented incorrectly** in the verification step. The post stated that the `mysql.user.ssl_type` column should equal `'SSL'` after `REQUIRE SSL` is applied. Per the MySQL grant-tables documentation, the column has only four possible values: `''`, `'ANY'`, `'X509'`, and `'SPECIFIED'`. `REQUIRE SSL` sets it to `'ANY'`. Updated the comment to reflect the correct value (`'ANY'`).

## Review Notes
- `mysql_ssl_rsa_setup` was deprecated in MySQL 8.0.34. It still functions but the server now auto-creates SSL/RSA files at startup if they are not present. Worth flagging in a future update, but not technically incorrect for the post.
- `SHOW BINARY LOG STATUS` requires MySQL 8.4.0+. On earlier 8.0.x releases, the equivalent statement is `SHOW MASTER STATUS`. The post calls out 8.0.23+ for the `SOURCE_*` syntax, so readers on 8.0.x but pre-8.4 will need to substitute `SHOW MASTER STATUS`. This is not strictly incorrect (the post is current to 8.4) but is a version caveat.
- `GRANT REPLICATION SLAVE` was supplemented by `GRANT REPLICATION REPLICA` in MySQL 8.0.26 as preferred terminology. Both still work; the legacy form is fine.
- The post sets `require_secure_transport = ON` at the server level *and* `REQUIRE SSL` on the replication user. This is redundant for the replication channel but not harmful, and `require_secure_transport = ON` does have the side effect of forcing all client connections (not just replication) to use TLS, which the post does not call out. Reader awareness item, not an error.
- The `Source_SSL_Allowed` field name referenced in the Key Takeaways is correct for MySQL 8.0.22+ (renamed from `Master_SSL_Allowed`).

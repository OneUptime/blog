# Validation Summary: How to Configure PgBouncer TLS/SSL for IPv4 Client Connections

## Status
validated

## Post Type
Guide

## Technologies Covered
- PgBouncer
- PostgreSQL
- TLS/SSL
- OpenSSL
- `psql`
- IPv4 networking

## Sources Consulted
- PgBouncer configuration documentation: https://www.pgbouncer.org/config
- PostgreSQL libpq SSL support documentation: https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL SSL/TLS server configuration documentation: https://www.postgresql.org/docs/current/ssl-tcp.html
- PostgreSQL `pg_hba.conf` documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- OpenSSL `openssl req` documentation: https://docs.openssl.org/master/man1/openssl-req/

## Issues Found
- `client_tls_protocols = tlsv1.2+` is not a valid PgBouncer value. Changed it to `secure`, which is the documented shortcut for allowing TLS 1.2 and TLS 1.3.
- The `client_tls_ca_file` comment implied mutual TLS would apply with `client_tls_sslmode = require`. Clarified that the CA file is used to validate client certificates when `verify-ca` or `verify-full` is enabled.
- The backend TLS example paired `server_tls_sslmode = require` with `server_tls_ca_file` as if `require` performed certificate validation. Changed the server-side examples to `verify-ca`, which matches the documented behavior when a CA file is used for backend certificate validation.
- The `pg_hba.conf` example allowed only the PostgreSQL user `pgbouncer`, but the shown PgBouncer database mapping does not force that backend user and the verification example connects as `appuser`. Updated the example to match the backend role used by the rest of the post.

## Review Notes
- PostgreSQL recommends `verify-full` when practical, but `verify-ca` is a better fit for the post's IP-based backend example unless the backend certificate includes matching IP subject alternative names.
- The self-signed certificate example is suitable for testing, not for production deployments.

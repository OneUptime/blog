# Validation Summary: How to Configure PostgreSQL with SSL/TLS Encryption on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- RHEL
- SSL/TLS
- OpenSSL
- PostgreSQL `postgresql.conf`
- PostgreSQL `pg_hba.conf`
- PostgreSQL `psql`

## Sources Consulted
- PostgreSQL Documentation: Secure TCP/IP Connections with SSL: https://www.postgresql.org/docs/current/ssl-tcp.html
- PostgreSQL Documentation: libpq SSL Support: https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL Documentation: The pg_hba.conf File: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL Documentation: Certificate Authentication: https://www.postgresql.org/docs/current/auth-cert.html
- PostgreSQL Documentation: pg_stat_ssl view: https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW
- OpenSSL Documentation: openssl-req: https://docs.openssl.org/3.6/man1/openssl-req/
- OpenSSL Documentation: openssl-x509: https://docs.openssl.org/3.3/man1/openssl-x509/
- Local OpenSSL command help for `openssl req` and `openssl x509`

## Issues Found
- The introduction said passwords and query data travel in plain text by default. This was too broad because PostgreSQL password exposure depends on the configured authentication method. Updated it to say query data and connection metadata are unencrypted, while password protection depends on authentication.
- The CA certificate generation did not explicitly mark the certificate as a CA certificate. Added `basicConstraints=critical,CA:TRUE` and CA key usage extensions.
- The server certificate generation used only a Common Name and did not include a Subject Alternative Name. Added SAN and server authentication extended key usage with an OpenSSL extension file when signing the certificate.
- The PostgreSQL configuration and `pg_hba.conf` examples were shown as commented-out shell lines, which would not apply the settings if copied. Split shell commands from configuration snippets and made the configuration entries active.
- The `sslmode=verify-full` example connected by IP address even though the generated certificate used the server hostname. Changed the verified connection example to use a hostname.
- The SSL status query used a non-existent `pg_stat_ssl` column, `ssl_is_used`. Replaced it with the documented `ssl` column.
- The SSL details query used non-existent `pg_stat_ssl` columns, `ssl_version` and `ssl_cipher`. Replaced them with the documented `version` and `cipher` columns.
- The `sslmode=require` explanation said it does not verify certificates. Updated it to recommend `verify-ca` or `verify-full` for explicit certificate verification, matching libpq behavior and avoiding reliance on compatibility behavior.
- The client certificate generation did not identify the certificate for client authentication. Added client authentication extended key usage with an OpenSSL extension file when signing the certificate.
- The mutual TLS `pg_hba.conf` example used `cert clientcert=verify-full`, which is redundant because `cert` authentication already requires a valid trusted client certificate and matches the certificate CN to the database user. Simplified it to `cert`.

## Review Notes
- The RHEL PostgreSQL data directory and systemd unit name can vary by packaging source and PostgreSQL major version. The examples are plausible for common RHEL PostgreSQL installations, but users of PGDG packages may need versioned paths or service names.

# Validation Summary: How to Secure PostgreSQL with SSL/TLS

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- PostgreSQL SSL/TLS configuration
- PostgreSQL `pg_hba.conf` authentication rules
- libpq / psql SSL connection parameters
- OpenSSL certificate generation and inspection commands
- Python `psycopg2`
- Node.js `pg` / node-postgres
- PostgreSQL JDBC Driver

## Sources Consulted
- PostgreSQL documentation: Secure TCP/IP Connections with SSL - https://www.postgresql.org/docs/current/ssl-tcp.html
- PostgreSQL documentation: libpq SSL Support - https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL documentation: Certificate Authentication - https://www.postgresql.org/docs/current/auth-cert.html
- PostgreSQL documentation: Connections and Authentication / SSL server parameters - https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL 10 release notes: SCRAM-SHA-256 authentication - https://www.postgresql.org/docs/release/10.0/
- PostgreSQL 12 release notes: `ssl_min_protocol_version` and `ssl_max_protocol_version` - https://www.postgresql.org/docs/release/12.0/
- pgJDBC documentation: Using SSL - https://jdbc.postgresql.org/documentation/ssl/
- node-postgres documentation: SSL - https://node-postgres.com/features/ssl
- Psycopg 2 documentation: connection keyword arguments - https://www.psycopg.org/docs/module.html
- OpenSSL documentation: `openssl-s_client` - https://docs.openssl.org/3.0/man1/openssl-s_client/

## Issues Found
- The prerequisites said PostgreSQL 9.4+ while the examples use `scram-sha-256`, which was introduced in PostgreSQL 10. Updated the prerequisite to PostgreSQL 10+ for SCRAM examples and noted that TLS protocol version settings require PostgreSQL 12+.
- The SSL modes table described `prefer` as encrypted whenever available. Official libpq documentation classifies `prefer` as "Maybe" for eavesdropping protection because it can fall back to a non-SSL connection. Updated the table entry to "Maybe".
- The "Client cert + password" `pg_hba.conf` example used `cert clientcert=verify-full`. PostgreSQL certificate authentication sends no password prompt, and the `clientcert` option is redundant with `cert`. Changed the example to `scram-sha-256 clientcert=verify-full` to require both a password and a verified client certificate.

## Review Notes
The remaining examples align with current PostgreSQL/libpq SSL behavior and the referenced driver documentation. For future hardening, the guide could mention that `ssl_ciphers` controls TLS 1.2 and lower, while TLS 1.3 cipher suites use `ssl_tls13_ciphers`, but the existing snippet is still technically valid.

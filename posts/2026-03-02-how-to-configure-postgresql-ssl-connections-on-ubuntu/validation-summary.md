# Validation Summary: How to Configure PostgreSQL SSL Connections on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- PostgreSQL 16
- PostgreSQL SSL/TLS configuration
- PostgreSQL pg_hba.conf client authentication
- libpq/psql SSL connection parameters
- OpenSSL certificate generation
- Certbot / Let's Encrypt certificate renewal
- Python psycopg2 connection parameters

## Sources Consulted
- PostgreSQL 16 Secure TCP/IP Connections with SSL: https://www.postgresql.org/docs/16/ssl-tcp.html
- PostgreSQL 16 Connections and Authentication settings: https://www.postgresql.org/docs/16/runtime-config-connection.html
- PostgreSQL 16 The pg_hba.conf File: https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL 16 Certificate Authentication: https://www.postgresql.org/docs/16/auth-cert.html
- PostgreSQL 16 libpq SSL Support: https://www.postgresql.org/docs/16/libpq-ssl.html
- PostgreSQL 16 Database Connection Control Functions: https://www.postgresql.org/docs/16/libpq-connect.html
- PostgreSQL 16 Monitoring Statistics / pg_stat_ssl: https://www.postgresql.org/docs/16/monitoring-stats.html
- Certbot renewal hooks documentation: https://eff-certbot.readthedocs.io/en/stable/using.html#renewal

## Issues Found
- The `psql` example said SSL was "required by default if server supports it". PostgreSQL libpq defaults to `sslmode=prefer`, which tries SSL first but can fall back to non-SSL. Changed the comment to say the example explicitly requires SSL.
- The certificate verification example used `sslrootcert=server.crt`. For production CA-issued certificates, clients should point `sslrootcert` at the trusted root or CA certificate. Changed the example to `sslrootcert=ca.crt`.
- The optional cipher list was labeled "strong" while the shown PostgreSQL default-compatible list includes `MEDIUM` and `+3DES`. Changed the comment to describe it as a cipher list example and note that PostgreSQL defaults are usually sufficient.
- The Certbot renewal command only reloaded PostgreSQL, but the post previously copied Let's Encrypt certificate files into `/etc/postgresql/ssl`. Renewed files would not be picked up unless copied again. Changed the command to use a deploy hook that copies the renewed certificate and key, resets ownership and permissions, and reloads PostgreSQL.

## Review Notes
- The PostgreSQL 16 configuration parameters shown are valid for the version-specific Ubuntu paths used in the post. PostgreSQL 18 renamed `ssl_ecdh_curve` to `ssl_groups`, so this guide should be revisited if it is updated for PostgreSQL 18 or later.
- The self-signed certificate examples use a Common Name without Subject Alternative Names. PostgreSQL 16 `verify-full` can fall back to the Common Name when no matching SAN is present, but SANs are preferable for broader TLS client compatibility.

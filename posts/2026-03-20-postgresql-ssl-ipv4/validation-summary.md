# Validation Summary: How to Configure PostgreSQL SSL/TLS for Encrypted IPv4 Connections

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- PostgreSQL 16
- SSL/TLS
- OpenSSL
- `psql` / libpq
- `pg_hba.conf`
- Certbot / Let's Encrypt

## Sources Consulted
- PostgreSQL 16 Documentation, "Secure TCP/IP Connections with SSL" - https://www.postgresql.org/docs/16/ssl-tcp.html
- PostgreSQL 16 Documentation, "Connections and Authentication" - https://www.postgresql.org/docs/16/runtime-config-connection.html
- PostgreSQL 16 Documentation, "The pg_hba.conf File" - https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL 16 Documentation, "SSL Support" - https://www.postgresql.org/docs/16/libpq-ssl.html
- PostgreSQL 16 Documentation, "The Cumulative Statistics System" (`pg_stat_ssl`) - https://www.postgresql.org/docs/16/monitoring-stats.html
- Certbot User Guide, "Standalone" - https://eff-certbot.readthedocs.io/en/stable/using.html#standalone

## Issues Found
- The introduction incorrectly stated that PostgreSQL 14+ ships with SSL enabled by default if certificates are present. I corrected this to match upstream PostgreSQL documentation, which requires explicitly setting `ssl = on`.
- The certificate setup comment used the wrong default filenames (`ssl-cert` / `ssl-key`). I corrected the filenames to PostgreSQL's documented defaults, `server.crt` and `server.key`.
- The post generated certificate files under `/etc/postgresql/16/main/` but configured `ssl_cert_file` and `ssl_key_file` as relative paths. Because PostgreSQL resolves relative SSL paths from `data_directory`, I changed the configuration example to use absolute paths so it matches the file locations shown in the commands.
- The remote IPv4 setup omitted `listen_addresses`, which is required for remote TCP/IP connections on a default PostgreSQL install. I added a matching `listen_addresses` example.
- The self-signed certificate example used a generic CN that would not identify the server meaningfully for hostname verification. I changed it to `db.example.com` to match the rest of the article's certificate examples.
- The Let's Encrypt example omitted a key runtime requirement. I added a note that `certbot --standalone` requires the requested name to resolve publicly and the host to accept inbound HTTP validation on port 80.
- The comment above `SHOW ssl_cert_file;` claimed it verifies the certificate. I corrected it to reflect what the command actually does: show the configured certificate path.
- The client examples and explanation around `sslmode=require` were too strong. I updated the examples to disable GSS encryption when demonstrating SSL specifically, and corrected the `sslmode=require` explanation to note that it enforces encryption but does not perform hostname verification and only behaves like `verify-ca` when a root CA file is already present.
- The `ssl_ciphers` comment said "Strong ciphers only", which was misleading for the documented default cipher string. I changed the comment to the technically accurate scope: it controls TLS 1.2 and lower cipher selection.

## Review Notes
- Let's Encrypt can issue certificates for database hosts only when the validation method can succeed. For private-only database hosts, DNS validation or an internal CA is often more practical than `--standalone`.
- In PostgreSQL 16, `ssl_ciphers` affects TLS 1.2 and lower only. TLS 1.3 cipher negotiation is handled separately by OpenSSL.

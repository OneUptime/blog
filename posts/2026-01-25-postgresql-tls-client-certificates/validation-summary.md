# Validation Summary: How to Configure TLS Client Certificates in PostgreSQL

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- PostgreSQL TLS/SSL configuration
- PostgreSQL certificate authentication
- PostgreSQL `pg_hba.conf` and `pg_ident.conf`
- OpenSSL certificate authority, certificate signing, PKCS#12 export, and CRLs
- libpq / `psql`
- psycopg2
- node-postgres (`pg`)
- PostgreSQL JDBC driver

## Sources Consulted
- PostgreSQL 18 documentation: Certificate Authentication - https://www.postgresql.org/docs/current/auth-cert.html
- PostgreSQL 18 documentation: Secure TCP/IP Connections with SSL - https://www.postgresql.org/docs/current/ssl-tcp.html
- PostgreSQL 18 documentation: The `pg_hba.conf` File - https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL 18 documentation: User Name Maps - https://www.postgresql.org/docs/current/auth-username-maps.html
- PostgreSQL 18 documentation: libpq SSL Support - https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL 18 documentation: `sslinfo` extension - https://www.postgresql.org/docs/current/sslinfo.html
- psycopg2 2.9 documentation: module and connection parameters - https://www.psycopg.org/docs/module.html
- node-postgres documentation: TLS/SSL - https://node-postgres.com/features/ssl
- PostgreSQL JDBC documentation: Using SSL - https://jdbc.postgresql.org/documentation/ssl/
- PostgreSQL JDBC documentation: connection properties - https://jdbc.postgresql.org/documentation/use/
- Local OpenSSL 3.0.13 command validation for the CA, signing, PKCS#12 export, revocation, and CRL generation flow.

## Issues Found
- The post said PostgreSQL extracts the username from the client certificate CN or SAN. PostgreSQL certificate authentication matches the requested username against the certificate CN by default, or against a mapped certificate name via `pg_ident.conf`; it does not use SAN for database username matching. Updated the explanation accordingly.
- The OpenSSL CA setup did not create the CA database/configuration needed by `openssl ca`, while the revocation script used `openssl ca -revoke` and `openssl ca -gencrl`. Added an `openssl.cnf`, CA index, serial, CRL number, and changed certificate signing to `openssl ca` so revocation and CRL generation work.
- The CA certificate did not explicitly include CA certificate extensions. Added `basicConstraints = critical, CA:TRUE` and `keyUsage = critical, keyCertSign, cRLSign`.
- The generated client private key was not permission-restricted. Added `chmod 600` to match libpq private-key requirements on Unix-like systems.
- The PKCS#12 export lacked the alias expected by pgJDBC. Added `-name user`.
- The PostgreSQL cipher example claimed to use strong ciphers but allowed `MEDIUM` and explicitly re-enabled 3DES. Changed it to `HIGH:!aNULL` and clarified the setting applies to TLS 1.2 and older.
- The `pg_hba.conf` examples were ordered so the catch-all certificate rule made later network-specific password authentication unreachable. Reordered the rules from more specific to more general.
- The example `cert clientcert=verify-full` line was redundant and did not actually demonstrate mapping. Changed it to a SCRAM rule with `clientcert=verify-full`, which correctly requires both a valid client certificate and password.
- The psycopg2 sample used the deprecated `database` alias and called `ssl_is_used()` without installing the `sslinfo` extension. Changed `database` to `dbname` and added `CREATE EXTENSION IF NOT EXISTS sslinfo`.
- The node-postgres example used CommonJS `require()` with top-level `await`, which is invalid in a normal CommonJS file. Wrapped the connection in an async `main()` function.
- The JDBC example pointed `sslkey` at a PEM private key while the post generated a PKCS#12 bundle and current pgJDBC documentation recommends PKCS#12. Updated the snippet to use `client.p12` with `sslpassword`.
- The verification section called `sslinfo` functions without first creating the extension. Added `CREATE EXTENSION IF NOT EXISTS sslinfo`.

## Review Notes
- The examples now align with current PostgreSQL 18 documentation and current driver documentation as of 2026-06-15.
- The `sslinfo` extension may require sufficient database privileges to install; production environments commonly install it once during database provisioning.
- The examples use a private CA for demonstration. Production deployments should protect the CA key outside the database server host when possible and define certificate rotation and revocation procedures.

# Validation Summary: How to Configure K3s with an External Database (PostgreSQL)

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- PostgreSQL
- Kubernetes
- PgBouncer
- systemd

## Sources Consulted
- K3s Cluster Datastore documentation: https://docs.k3s.io/datastore
- K3s High Availability External DB documentation: https://docs.k3s.io/datastore/ha
- K3s Server CLI documentation: https://docs.k3s.io/cli/server
- K3s Configuration documentation: https://docs.k3s.io/installation/configuration
- PostgreSQL `pg_hba.conf` documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL libpq connection string and `sslmode` documentation: https://www.postgresql.org/docs/current/libpq-connect.html
- PgBouncer configuration documentation: https://www.pgbouncer.org/config

## Issues Found
- The post hard-coded PostgreSQL 14 file paths while also describing PostgreSQL `14+`. I changed the `pg_hba.conf` path guidance to be version-agnostic and replaced the `sed` edit with `ALTER SYSTEM SET listen_addresses = '*'` so the configuration step is not tied to a specific PostgreSQL major version.
- The primary K3s install example showed `sslmode=verify-full` even though the surrounding DSN example and later config-file example used `sslmode=disable`. I changed the Step 2 install command to use `sslmode=disable` so Step 2 remains internally consistent and Step 3 remains the dedicated TLS example.
- The TLS example used `sslmode=verify-full` with an IP address. `verify-full` checks that the requested host matches the server certificate, so I changed the example to use `db.example.com` and noted that the hostname must match the certificate.
- The additional-server guidance implied only the datastore endpoint needed to match. I corrected the text to note that the token and other critical server configuration values also need to match across K3s servers.
- The PgBouncer best-practice bullet was too broad. K3s requires prepared statement support from the datastore layer, so I changed the recommendation to say PgBouncer must be configured for prepared statement support if it is used.

## Review Notes
- K3s documentation currently certifies PostgreSQL 15.12, 16.7, and 17.3 as of April 29, 2026.
- K3s recommends using environment variables instead of command-line arguments for datastore credentials when possible, to avoid exposing secrets in process listings.

# Validation Summary: How to Configure TLS Encryption for Database Connections

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes StatefulSets, Services, Secrets, ConfigMaps, and container command/args
- cert-manager Certificates, ClusterIssuers, CA issuers, and cmctl
- PostgreSQL 15 TLS configuration, pg_hba.conf, libpq SSL options, and pg_stat_ssl
- MySQL 8.0 TLS configuration
- Python psycopg2 database connections
- PrometheusRule certificate expiry alerting

## Sources Consulted
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager cmctl renew documentation: https://cert-manager.io/docs/reference/cmctl/
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes Secret file permissions documentation: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- PostgreSQL 15 SSL server documentation: https://www.postgresql.org/docs/15/ssl-tcp.html
- PostgreSQL libpq SSL documentation: https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL certificate authentication documentation: https://www.postgresql.org/docs/15/auth-cert.html
- PostgreSQL pg_hba.conf documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- PostgreSQL pg_stat_ssl documentation: https://www.postgresql.org/docs/current/static/monitoring-stats.html
- MySQL 8.0 encrypted connections documentation: https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html
- Docker PostgreSQL initialization documentation: https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/

## Issues Found
- The cert-manager install manifest referenced v1.13.3, which is outdated relative to the current official static install documentation. Updated it to v1.20.2.
- The PostgreSQL StatefulSet used `command`, which overrides the official PostgreSQL image entrypoint and would skip initialization behavior. Changed it to `args` so the image entrypoint still runs.
- The PostgreSQL TLS Secret was mounted directly with restrictive permissions, then the init script attempted to `chmod` and `chown` files on a read-only Secret volume. Added an init container that copies certificates into an `emptyDir` and sets ownership and permissions there.
- The PostgreSQL `pg_hba.conf` init script wrote to `/var/lib/postgresql/data/pg_hba.conf`, but the manifest sets `PGDATA=/var/lib/postgresql/data/pgdata`. Updated the script to write to `$PGDATA/pg_hba.conf`.
- The PostgreSQL `pg_hba.conf` example appended SSL rules after existing generated rules, which could leave non-TLS host rules effective first. Updated it to write an explicit SSL-required configuration using `hostssl` and `hostnossl`.
- The PostgreSQL certificate and application examples connected to `postgres.database.svc.cluster.local`, but no `postgres` Service existed. Added a normal `postgres` Service alongside the headless Service.
- The MySQL certificate and StatefulSet examples referenced `mysql` and `mysql-headless` DNS names, but did not define either Service. Added both Services.
- The Python verification query used `ssl_is_used()`, `ssl_version()`, and `ssl_cipher()` from the optional `sslinfo` extension without installing that extension. Replaced it with the built-in `pg_stat_ssl` view.
- The Python example created an `ssl.SSLContext` but psycopg2/libpq does not use that object from the shown connection call. Removed the unused SSL context code and kept the libpq SSL parameters.
- The mTLS example used a client certificate common name that would not match the `postgres` database user under PostgreSQL certificate authentication. Updated the client certificate common name to `postgres`.
- The mTLS client paths used `client.crt` and `client.key`, but cert-manager Secrets use `tls.crt` and `tls.key`. Updated the connection parameters to those file names.
- The PostgreSQL certificate-authentication `pg_hba.conf` example redundantly specified `clientcert=verify-full` with the `cert` authentication method. Simplified the lines to use `cert`, which PostgreSQL documents as equivalent to certificate verification with common-name matching.
- The manual renewal command deleted the TLS Secret. Replaced it with the documented `cmctl renew` command.
- The `pg_hba.conf` and PostgreSQL TLS settings snippets were marked as YAML even though they are PostgreSQL configuration syntax. Updated the code fences to `conf`.

## Review Notes
- The examples remain tutorial-grade and omit some production hardening details, such as database replication configuration, readiness probes, password rotation, network policies, and a complete mTLS application Deployment that mounts the client certificate Secret.
- The PostgreSQL certificate-copy init container uses the official image's conventional `postgres` UID. A production manifest may prefer a custom image or security context that makes UID/GID ownership explicit.

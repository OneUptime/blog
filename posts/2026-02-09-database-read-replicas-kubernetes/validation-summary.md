# Validation Summary: How to Implement Database Read Replicas for Load Distribution on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes StatefulSets, Services, Secrets, Deployments, and lifecycle hooks
- PostgreSQL 15 streaming replication, hot standby, pg_basebackup, pg_ctl promotion, and replication lag functions
- PgBouncer connection pooling
- Python psycopg2 query routing
- Prometheus text exposition format and PrometheusRule alerts

## Sources Consulted
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes Services documentation, including headless Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- PostgreSQL 15 CREATE USER documentation: https://www.postgresql.org/docs/15/sql-createuser.html
- PostgreSQL 15 pg_basebackup documentation: https://www.postgresql.org/docs/15/app-pgbasebackup.html
- PostgreSQL 15 hot standby documentation: https://www.postgresql.org/docs/15/hot-standby.html
- PostgreSQL 15 failover documentation: https://www.postgresql.org/docs/15/warm-standby-failover.html
- PgBouncer configuration documentation: https://www.pgbouncer.org/config
- psycopg2 connection documentation: https://www.psycopg.org/docs/connection.html
- Prometheus exposition format documentation: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
- The StatefulSet referenced `serviceName: postgres` but no governing Service named `postgres` existed. Added a headless `postgres` Service so StatefulSet pod DNS names such as `postgres-0.postgres.databases.svc.cluster.local` are valid.
- The init container ran `initdb` without setting the database superuser from the Secret and used marker files inside `PGDATA`, which would be copied into replicas by `pg_basebackup`. Updated initialization to use the Secret-backed username/password and moved role markers outside `PGDATA`.
- The example used invalid PostgreSQL syntax, `CREATE USER IF NOT EXISTS`. Replaced it with idempotent role/database checks and valid `CREATE ROLE` / `createdb` commands.
- The Kubernetes lifecycle hook included an `env` field under `exec`, which is not a valid lifecycle handler field. Moved `REPLICATION_PASSWORD` into the container environment.
- The replica initialization created `standby.signal` manually after `pg_basebackup -R`, even though `-R` already creates it and writes recovery connection settings. Removed the redundant manual creation.
- The PgBouncer section described automatic read-write splitting. Clarified that PgBouncer pools configured database aliases and the application must route reads and writes explicitly.
- The PgBouncer userlist placeholder looked like a literal usable MD5 value. Replaced it with a clearer placeholder showing the required MD5 password format.
- The Python example bypassed the PgBouncer service despite the previous section deploying PgBouncer. Updated the DSNs to use PgBouncer's `appdb_primary` and `appdb_replica` aliases.
- The replication monitor only printed metrics to stdout while the Service advertised a Prometheus scrape port. Updated it to expose a minimal HTTP response with Prometheus text format on port 9090.
- The replica-down alert referenced an undefined `postgres-replicas` scrape job. Updated it to match the replication monitor target used by the example.
- The promotion section implied label changes were sufficient after failover. Added a note that remaining replicas must be recreated or reconfigured to follow the promoted primary.

## Review Notes
The post remains a simplified educational example rather than a production-ready PostgreSQL operator replacement. Future improvements could cover replication slots, TLS, SCRAM authentication, PodDisruptionBudgets, automated failover tooling, and avoiding package installation at container startup for the monitor.

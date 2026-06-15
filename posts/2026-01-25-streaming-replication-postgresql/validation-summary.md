# Validation Summary: How to Set Up Primary-Replica Streaming Replication in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL 15 streaming replication
- PostgreSQL WAL and physical replication slots
- PostgreSQL configuration files (`postgresql.conf`, `pg_hba.conf`)
- `pg_basebackup`, `pg_ctl`, and `pg_promote()`
- Synchronous replication
- PostgreSQL replication monitoring views
- psycopg2 connection pooling
- Prometheus-style SQL metrics

## Sources Consulted
- PostgreSQL 15 Log-Shipping Standby Servers: https://www.postgresql.org/docs/15/warm-standby.html
- PostgreSQL 15 `pg_basebackup` documentation: https://www.postgresql.org/docs/15/app-pgbasebackup.html
- PostgreSQL 15 Replication Configuration: https://www.postgresql.org/docs/15/runtime-config-replication.html
- PostgreSQL 15 `pg_hba.conf` documentation: https://www.postgresql.org/docs/15/auth-pg-hba-conf.html
- PostgreSQL 15 Cumulative Statistics System: https://www.postgresql.org/docs/15/monitoring-stats.html
- PostgreSQL 15 System Administration Functions: https://www.postgresql.org/docs/15/functions-admin.html
- psycopg2 connection pooling documentation: https://www.psycopg.org/docs/pool.html

## Issues Found
- The introduction said streaming replication enables automatic failover. PostgreSQL streaming replication supports standby promotion, but automatic failover requires external management or tooling. Changed this to "managed failover."
- The `postgresql.conf` comment said "Enable WAL archiving and replication" even though no archiving settings were shown. Changed it to "Configure WAL retention and replication."
- The replication user section granted `pg_read_all_data` for `pg_basebackup`. Official PostgreSQL documentation requires a superuser or a user with `REPLICATION` permission and a matching `pg_hba.conf` entry; `pg_read_all_data` is not required for this physical base backup. Removed the grant and clarified the requirement.
- The multi-line `pg_basebackup` command placed comments after line-continuation backslashes, which makes the shell command invalid. Moved those explanations below the command.
- The rebuild-after-failover `pg_basebackup` example used `-S old_primary_slot` without first creating that slot. PostgreSQL requires the slot to exist unless `-C` is supplied, so added `-C`.
- The synchronous replication section described the setup as "zero data loss" too broadly. PostgreSQL guarantees that acknowledged commits wait for the configured synchronous standby confirmation level, but this depends on the configured synchronous standby and failure scenario. Reworded the claim and trade-off accordingly.
- The synchronous replication example did not mention that standby names in `synchronous_standby_names` must match the standby `application_name`. Added that caveat.
- The psycopg2 read-routing example tried to return a connection to the right replica pool by calling `putconn()` on each pool until one worked. psycopg2 pools should return connections to the same pool that issued them. Updated the code to return the selected pool alongside the connection and call `putconn()` on that pool directly.

## Review Notes
The article is technically relevant and current for PostgreSQL 15. The examples assume Debian/Ubuntu-style paths and service names (`/etc/postgresql/15/main`, `/var/lib/postgresql/15/main`, `systemctl restart postgresql`), which is acceptable for a practical guide but should be called out if the post is later expanded for non-Debian installations.

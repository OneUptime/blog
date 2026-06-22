# Validation Summary: How to Implement PostgreSQL Read Replicas

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- PostgreSQL streaming replication
- PostgreSQL physical replication slots
- PostgreSQL hot standby and replication monitoring
- pg_basebackup
- pg_hba.conf authentication rules
- HAProxy PostgreSQL health checks
- PgBouncer database routing
- psycopg
- node-postgres
- Prometheus postgres_exporter custom queries

## Sources Consulted
- PostgreSQL 16 Replication configuration: https://www.postgresql.org/docs/16/runtime-config-replication.html
- PostgreSQL 16 Log-Shipping Standby Servers: https://www.postgresql.org/docs/16/warm-standby.html
- PostgreSQL 16 pg_basebackup: https://www.postgresql.org/docs/16/app-pgbasebackup.html
- PostgreSQL 16 libpq connection strings and target_session_attrs: https://www.postgresql.org/docs/16/libpq-connect.html
- PostgreSQL 16 System Administration Functions: https://www.postgresql.org/docs/16/functions-admin.html
- PostgreSQL 16 CREATE ROLE: https://www.postgresql.org/docs/16/sql-createrole.html
- PostgreSQL 16 pg_hba.conf: https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL 16 Cumulative Statistics System: https://www.postgresql.org/docs/16/monitoring-stats.html
- HAProxy configuration manual, pgsql-check and server check options: https://www.haproxy.com/documentation/haproxy-configuration-manual/2-0r1/
- PgBouncer configuration reference: https://www.pgbouncer.org/config.html
- Psycopg 3 connection documentation: https://www.psycopg.org/psycopg3/docs/api/connections.html
- Psycopg 3 basic usage documentation: https://www.psycopg.org/psycopg3/docs/basic/usage.html
- node-postgres connecting documentation: https://node-postgres.com/features/connecting

## Issues Found
- The primary server configuration included `hot_standby` and `hot_standby_feedback` with comments implying they should be enabled on the primary for replicas. PostgreSQL documents these as standby-side settings; `hot_standby` only has effect during recovery or standby mode, and `hot_standby_feedback` controls feedback sent by a standby. Removed those lines from the primary configuration because the replica configuration already sets them.
- The replication user section granted `pg_read_all_data` and described it as necessary. PostgreSQL physical replication requires a role with the `REPLICATION` attribute or superuser privileges; table-level read grants are not required. Replaced the grant with a clarifying comment.
- The PgBouncer section title said "with Target Session Attrs", but the shown PgBouncer configuration does not use libpq `target_session_attrs`. Renamed it to describe the actual read-only pool configuration.
- The node-postgres example used a comma-separated `host` and `target_session_attrs`, which matches libpq-style connection behavior but is not part of the documented node-postgres programmatic pool configuration. Replaced it with two explicit replica pools and simple round-robin selection.
- The replica lag function and Python lag check used only `NOW() - pg_last_xact_replay_timestamp()`, which can look stale when the primary has been idle even if received WAL has been replayed. Updated both examples to return zero lag when receive and replay LSNs match, matching the earlier SQL example in the post.

## Review Notes
- The HAProxy `pgsql-check user haproxy` example is syntactically valid, but a production setup must ensure PostgreSQL authentication rules allow the health-check user.
- The PgBouncer host list syntax is valid, but PgBouncer documentation notes that comma-separated hosts are selected round-robin and are not a substitute for health-aware failover.

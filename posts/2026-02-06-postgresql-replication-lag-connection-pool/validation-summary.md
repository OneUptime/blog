# Validation Summary: How to Monitor PostgreSQL Replication Lag, Connection Pool Stats,

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector PostgreSQL receiver
- PostgreSQL
- PostgreSQL streaming replication
- PostgreSQL system statistics views
- PgBouncer
- Prometheus scraping
- Docker Compose

## Sources Consulted
- OpenTelemetry Collector PostgreSQL receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/postgresqlreceiver/README.md
- OpenTelemetry Collector PostgreSQL receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/postgresqlreceiver/metadata.yaml
- OpenTelemetry Collector configuration environment variables: https://opentelemetry.io/docs/collector/configuration/
- PostgreSQL monitoring statistics documentation: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL predefined roles documentation: https://www.postgresql.org/docs/current/predefined-roles.html
- PostgreSQL pg_locks documentation: https://www.postgresql.org/docs/current/view-pg-locks.html
- PgBouncer usage documentation: https://www.pgbouncer.org/usage
- prometheus-community PgBouncer exporter README: https://github.com/prometheus-community/pgbouncer_exporter
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Collector password example used `${POSTGRES_PASSWORD}`. Updated it to the current documented Collector environment-variable syntax, `${env:POSTGRES_PASSWORD}`.
- The Collector metric configuration and cache-hit alert used `postgresql.blocks_hit`, which is not a current PostgreSQL receiver metric name. Updated the cache metrics to `postgresql.blks_hit` and `postgresql.blks_read`.
- The post described `postgresql.backends` as active backend connections. Updated this to current backend connections because the metric counts backends, not only sessions in the `active` state.
- The connection-capacity alert compared one `postgresql.backends` value to a hard-coded threshold. Updated it to compare summed backends against `postgresql.connection.max`.
- The PgBouncer metrics omitted the `_connections` suffix used by common PgBouncer Prometheus exporters. Updated the metric names and clarified that a PgBouncer Prometheus exporter is required.
- The lock-wait query self-joined `pg_locks` on too few lock identity columns and could produce incorrect blockers or miss non-relation locks. Replaced it with a query using PostgreSQL's `pg_blocking_pids()` function.
- The Docker Compose example used the obsolete top-level `version` property. Removed it.

## Review Notes
The alert-condition YAML remains illustrative because alert expression syntax varies by backend. The PostgreSQL receiver metrics are marked development stability in the receiver metadata even though the receiver's metrics signal is beta.

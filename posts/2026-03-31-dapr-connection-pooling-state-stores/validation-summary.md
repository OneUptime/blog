# Validation Summary: How to Use Connection Pooling with Dapr Database State Stores

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state store components, sidecar architecture)
- PostgreSQL (state store backend, connection monitoring)
- PgBouncer (connection pooling proxy)
- Kubernetes (Deployments, Services, sidecar pattern)
- pgx (Go PostgreSQL driver used by Dapr internally)

## Sources Consulted
- Dapr PostgreSQL v2 state store documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- PostgreSQL `max_connections` documentation: https://www.postgresql.org/docs/current/runtime-config-connection.html
- MySQL `max_connections` documentation: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_connections
- pgx/v5 pgxpool connection string parameters: https://pkg.go.dev/github.com/jackc/pgx/v5/pgxpool
- PgBouncer official documentation (default port 6432): https://www.pgbouncer.org/config.html
- Docker Hub `edoburu/pgbouncer` image and supported environment variables
- Docker Hub `pgbouncer/pgbouncer` image (verified tag availability)
- Kubernetes `apps/v1` Deployment specification

## Issues Found

1. **Incorrect PgBouncer Docker image name and tag**: The post used `pgbouncer/pgbouncer:1.22.0`, but that image does not have a `1.22.0` tag (its latest is `1.15.0`, last updated in 2020). The environment variables used in the post (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `POOL_MODE`, `MAX_CLIENT_CONN`, `DEFAULT_POOL_SIZE`) match the `edoburu/pgbouncer` image. Changed all three occurrences to `edoburu/pgbouncer:1.22.0-p0`.

2. **Option 2 Deployment missing required Kubernetes fields**: The Deployment manifest was missing `spec.selector` and `spec.template.metadata.labels`, both of which are required for `apps/v1` Deployments. Without these, `kubectl apply` would reject the manifest. Added `selector.matchLabels` and template labels with `app: myservice`.

3. **Option 3 Deployment missing pod template labels**: The shared PgBouncer Deployment had `spec.selector.matchLabels: app: pgbouncer` but the pod template was missing `metadata.labels`. The selector would match no pods, so no replicas would ever become ready. Added `metadata.labels.app: pgbouncer` to the pod template.

## Review Notes
- The connection string pool parameters (`pool_max_conns`, `pool_min_conns`, `pool_max_conn_idle_time`) are valid pgx DSN parameters and will work. However, Dapr also exposes these as first-class component metadata fields (`maxConns`, `connectionMaxIdleTime`). The metadata approach is the officially documented method and may be more portable across Dapr updates. This is a style preference, not an error.
- PgBouncer 1.22.0 was released January 2024. Newer versions exist (1.25.x as of early 2026), but 1.22.0 remains functional and the post does not claim it is the latest.
- The `pg_stat_activity` monitoring query and `SHOW POOLS` PgBouncer admin command are both correct.
- All database default connection limits cited (PostgreSQL 100, MySQL 151, SQL Server ~32,767) are accurate.

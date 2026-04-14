# Validation Summary: How to Tune PostgreSQL Performance for Dapr State Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state management, sidecar architecture)
- PostgreSQL (server configuration, WAL tuning, autovacuum, pg_stat_statements)
- PgBouncer (connection pooling)
- Kubernetes (ConfigMap for PgBouncer deployment)
- pgx/pgxpool (PostgreSQL driver used by Dapr v2)

## Sources Consulted
- Dapr PostgreSQL state store v2 component source code (dapr/components-contrib repository, `state/postgresql/v2/postgresql.go` and `metadata.go`)
- Dapr component specification for PostgreSQL v2 state store (docs.dapr.io)
- PostgreSQL documentation for server configuration parameters (shared_buffers, effective_cache_size, WAL settings, autovacuum)
- PostgreSQL pg_stat_statements documentation (column names changed in PostgreSQL 13)
- PgBouncer documentation for auth_type and pool configuration
- pgx/pgxpool documentation for connection string parameters (pool_max_conns)

## Issues Found

### 1. Incorrect column name `update_time` in partial index SQL
- **What was wrong:** The partial index used `WHERE update_time > NOW() - INTERVAL '1 hour'`, but the Dapr PostgreSQL v2 state table uses the column name `updated_at`, not `update_time`.
- **What was changed:** Replaced `update_time` with `updated_at`.
- **Why:** The Dapr v2 state store migration creates columns named `key`, `value`, `etag`, `created_at`, `updated_at`, `expires_at`, and `row_id`. Using `update_time` would cause a SQL error.

### 2. Incorrect metadata field `tableName` for Dapr PostgreSQL v2
- **What was wrong:** The Dapr component YAML used `tableName: "dapr_state"`, but the v2 PostgreSQL state store uses `tablePrefix`, not `tableName`. The table name is constructed as `{tablePrefix}state`.
- **What was changed:** Replaced `tableName` with `tablePrefix` and changed the value from `"dapr_state"` to `"dapr_"` (which produces the table name `dapr_state`).
- **Why:** `tableName` was used in v1 of the PostgreSQL state store. In v2, it was replaced by `tablePrefix`. Using `tableName` would be silently ignored, causing the table to default to `state` and making the subsequent SQL examples (which reference `dapr_state`) incorrect.

## Review Notes
- The `autovacuum_vacuum_cost_delay = 2` setting is technically valid but redundant on PostgreSQL 12+, where the default is already 2ms. This is not an error but has no effect on modern PostgreSQL installations.
- The `cleanupInterval: "1h"` setting is correct for v2 but is also the default value, so it could be omitted. Leaving it explicit is fine.
- The `pg_stat_statements` query uses `total_exec_time`, which is correct for PostgreSQL 13+ but will fail on PostgreSQL 12 and earlier (where the column was named `total_time`). The post doesn't specify a PostgreSQL version, so this is acceptable for modern deployments.
- The `pool_max_conns=10` parameter in the connection string is valid for pgx/pgxpool, which Dapr v2 uses internally.
- PgBouncer `auth_type = scram-sha-256` is valid and supported since PgBouncer 1.14+.
- All PostgreSQL server configuration parameters in `postgresql.conf` are valid with reasonable values for a tuned deployment.

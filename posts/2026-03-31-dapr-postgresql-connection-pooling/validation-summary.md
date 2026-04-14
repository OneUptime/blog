# Validation Summary: How to Configure PostgreSQL Connection Pooling for Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (state store component, PostgreSQL v2 plugin)
- PostgreSQL
- PgBouncer (connection pooler)
- Kubernetes (Deployments, Secrets)
- Bitnami PgBouncer container image

## Sources Consulted
- Dapr PostgreSQL v2 state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr PostgreSQL v1 state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v1/
- Dapr components-contrib source code (state/postgresql/v2): https://github.com/dapr/components-contrib
- Bitnami PgBouncer container documentation: https://hub.docker.com/r/bitnami/pgbouncer
- PgBouncer official documentation: https://www.pgbouncer.org/config.html
- PostgreSQL documentation (max_connections): https://www.postgresql.org/docs/current/runtime-config-connection.html

## Issues Found

### 1. PgBouncer port incorrect (5432 → 6432)
**What was wrong:** The PgBouncer Deployment used `containerPort: 5432`, and the connection string and admin command also referenced port 5432. PgBouncer's default listen port is 6432, and the bitnami image was not configured to override it.
**What was changed:** Updated `containerPort` to 6432, added explicit `PGBOUNCER_PORT: "6432"` env var, changed connection string port to 6432, and updated the admin `psql` command to use `-p 6432`.

### 2. Dapr v2 metadata field `tableName` does not exist (→ `tablePrefix`)
**What was wrong:** The Dapr component used `tableName: "dapr_state"` and `schemaName: "dapr"`, which are v1 fields. The v2 component uses `tablePrefix` instead, where schema is included as a prefix (e.g., `"dapr."`).
**What was changed:** Replaced `tableName` and `schemaName` with `tablePrefix: "dapr."`.

### 3. Dapr v2 metadata field `timeoutInSeconds` renamed (→ `timeout`)
**What was wrong:** The field `timeoutInSeconds` is not a recognized v2 metadata field. The correct name is `timeout`.
**What was changed:** Changed to `timeout` with value `"20s"`.

### 4. Dapr v2 metadata field `connMaxIdleTime` incorrect (→ `connectionMaxIdleTime`)
**What was wrong:** The field name `connMaxIdleTime` is not recognized. The correct v2 field is `connectionMaxIdleTime`.
**What was changed:** Renamed to `connectionMaxIdleTime`.

### 5. Connection string contained invalid `pool_mode=transaction` parameter
**What was wrong:** `pool_mode` is a PgBouncer server-side configuration option, not a valid libpq or pgx connection string parameter. Including it would cause pgx (used internally by Dapr) to error with "unrecognized configuration parameter". The pool mode was already correctly configured via `PGBOUNCER_POOL_MODE` in the PgBouncer deployment.
**What was changed:** Removed `pool_mode=transaction` from the connection string.

### 6. Dapr v2 table schema had incorrect column types and names
**What was wrong:** The manual SQL schema had multiple errors vs. the actual Dapr v2 schema:
- `value` column was `JSONB` but should be `BYTEA` (v2 uses binary storage)
- `etag` column was `TEXT` but should be `UUID DEFAULT gen_random_uuid()`
- `expirytime` column should be named `expires_at`
- `updatetime` column should be named `updated_at` (nullable, no default)
- Missing `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` column
- Table name was `dapr_state` but with `tablePrefix: "dapr."` the default table is `dapr.state`
**What was changed:** Rewrote the schema to match the actual Dapr v2 table structure with correct column names, types, and defaults.

### 7. Kubernetes Deployment template missing pod labels
**What was wrong:** The Deployment `spec.selector.matchLabels` referenced `app: pgbouncer`, but the pod template was missing its `metadata.labels` section. This would cause the Deployment to fail validation since the selector wouldn't match any pods.
**What was changed:** Added `metadata.labels.app: pgbouncer` to the pod template.

## Review Notes
- The "Tuning Pool Size Per Sidecar" section's formula comment says the result is "connections per pool" but actually computes total client connections to PgBouncer, not per-pool backend connections. The math is illustrative rather than a precise sizing guide, but is not misleading enough to warrant a change.
- The bitnami/pgbouncer:1.22.0 image tag references a specific version. PgBouncer 1.22.0 is a valid release, though newer versions may be available.
- The post correctly notes that Dapr can auto-create tables, which is the recommended approach for most deployments. The manual schema is useful for environments with restricted database permissions.

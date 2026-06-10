# Validation Summary: How to Deploy CockroachDB Cluster

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- CockroachDB (v23.2.0)
- Bare-metal / VM installation with TLS certificates
- Docker Compose
- Kubernetes with Helm (cockroachdb/cockroachdb chart)
- SQL (CockroachDB dialect): DDL, zone configuration, partitioning, users/grants
- BACKUP / RESTORE / CREATE SCHEDULE (S3 storage)
- Prometheus + Grafana monitoring (`/_status/vars` endpoint, `liveness_livenodes`, `sql_query_count`, `sql_exec_latency_bucket`)
- PgBouncer connection pooling
- Python psycopg2 client example

## Sources Consulted
- CockroachDB v23.2 official documentation: https://www.cockroachlabs.com/docs/v23.2/
- `cockroach start` flags reference: https://www.cockroachlabs.com/docs/v23.2/cockroach-start
- `cockroach cert` reference: https://www.cockroachlabs.com/docs/v23.2/cockroach-cert
- `cockroach node` (drain, decommission, status): https://www.cockroachlabs.com/docs/v23.2/cockroach-node
- `cockroach debug recover` (replacement for unsafe-remove-dead-replicas): https://www.cockroachlabs.com/docs/v23.2/cockroach-debug-recover
- CockroachDB v23.1 release notes (documenting removal of `cockroach quit`)
- CockroachDB `BACKUP` / `RESTORE` / `CREATE SCHEDULE FOR BACKUP` syntax docs
- `crdb_internal` virtual tables documentation (`kv_node_status`, `kv_store_status`, `ranges`, `gossip_nodes`, `gossip_liveness`, `node_statement_statistics`)
- CockroachDB Helm chart values reference: https://github.com/cockroachdb/helm-charts
- PgBouncer documentation: https://www.pgbouncer.org/config.html

## Issues Found

1. **`cockroach quit` is removed in v23.1+** — The post uses `cockroach quit` in two places to stop nodes after decommissioning and during certificate rotation. This command was deprecated in v20.1 and removed in v23.1; since the post targets v23.2.0, these calls would fail. Replaced both with `cockroach node drain`, which is the documented replacement.

2. **`cockroach debug unsafe-remove-dead-replicas` no longer exists** — Replaced by the `cockroach debug recover` workflow (collect-info → make-plan → apply-plan). Updated the troubleshooting snippet to use `cockroach debug recover collect-info` as the entry point and noted that it is a multi-step offline process so readers don't think the single command is sufficient.

3. **Wrong virtual table for `range_count` / `lease_count`** — The "View range distribution across nodes" query selects `range_count, lease_count` from `crdb_internal.kv_node_status`, but those columns live on `crdb_internal.kv_store_status` (kv_node_status exposes node metadata with metrics as a JSONB blob). Changed the FROM clause to `crdb_internal.kv_store_status`, which is consistent with the very next query in the same section.

## Review Notes

- The post pins CockroachDB v23.2.0 throughout. v23.2 reached EOL in February 2025, so readers in 2026 would more realistically use v24.x or v25.x. The deployment commands are largely unchanged, but a future revision could bump the version.
- The `--background` flag on `cockroach start` is deprecated (and removed in v24.1+); for v23.2 it still works but the documented best practice is to use systemd or another process manager. Left as-is since it is still functional for the targeted version.
- The `BACKUP` / `CREATE SCHEDULE` examples are correct syntax, but scheduled backups require an Enterprise license in older versions (free in CockroachDB Cloud / newer self-hosted with Enterprise features unlocked). Not a correctness issue.
- The Helm values structure (`statefulset`, `storage.persistentVolume`, `tls.certs.selfSigner`, `conf.cache`, `conf.max-sql-memory`, `conf.join`, `service.public`) matches the official `cockroachdb/cockroachdb` chart at the time the post was written.
- The PgBouncer config uses `pool_mode = transaction`, which is the recommended mode for CockroachDB, though apps using session-level state (e.g. `SET` statements, server-side prepared statements) need to be aware of the limitations. Acceptable for a generic example.
- All `crdb_internal` virtual tables referenced (`gossip_nodes`, `gossip_liveness`, `ranges`, `node_statement_statistics`, `kv_store_status`) exist and expose the columns used.

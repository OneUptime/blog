# Validation Summary: How to Install and Configure InfluxDB on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation and configuration guide

## Technologies Covered
- InfluxDB 2.x (time-series database)
- Ubuntu (apt package management, systemd)
- Flux query language
- InfluxDB Line Protocol
- `influx` CLI and `influxd` server
- InfluxDB HTTP API (`/api/v2/write`, `/api/v2/query`, `/health`, `/ready`)
- Python `influxdb-client` library
- Telegraf

## Sources Consulted
- InfluxDB OSS v2 — Configuration options: https://docs.influxdata.com/influxdb/v2/reference/config-options/
- InfluxDB OSS v2 — Flux syntax: https://docs.influxdata.com/influxdb/v2/reference/syntax/flux/
- InfluxData blog — "Why We're Building Flux, a New Data Scripting and Query Language": https://www.influxdata.com/blog/why-were-building-flux-a-new-data-scripting-and-query-language/
- InfluxDB — Flux vs InfluxQL: https://docs.influxdata.com/influxdb/v1/flux/flux-vs-influxql/
- InfluxDB OSS v2 — File system layout: https://docs.influxdata.com/influxdb/v2/reference/internals/file-system-layout/

## Issues Found

1. **Flux mischaracterized as "SQL-like" (Features section).** The post listed "SQL-like query language (Flux)". Flux is a *functional data scripting and query language* — InfluxData deliberately chose not to implement SQL for it; InfluxQL is the SQL-like language. Changed the bullet to "Functional data scripting and query language (Flux)".

2. **Configuration File snippet used nested TOML tables.** The original used `[storage]`, `[query]`, and `[logging]` tables with nested keys (`wal-fsync-delay`, `memory-bytes`, `concurrency`, `level`, `format`). InfluxDB 2.x configuration files use **flat top-level keys** — InfluxDB would not parse the table form. Converted to the correct flat keys: `storage-wal-fsync-delay`, `query-memory-bytes`, `query-concurrency`, and `log-level`. Removed the invalid `format = "auto"` key (no such config option exists in v2).

3. **Performance Tuning snippet used a `[storage-engine]` table with v1-style keys.** The original used `[storage-engine]` with `cache-max-memory-size = "1g"` / `cache-snapshot-memory-size = "25m"` and a `[query]` table. These are not valid InfluxDB 2.x options. Replaced with the correct flat keys `storage-cache-max-memory-size` and `storage-cache-snapshot-memory-size` (which accept integer byte values, not human-readable strings — used `1073741824` for 1 GiB and `26214400` for 25 MiB, the documented defaults) and `query-memory-bytes`.

## Review Notes
- The repository setup (download of `influxdata-archive_compat.key`, sha256 verification, `gpg --dearmor` into `/etc/apt/keyrings/`, signed-by sources entry), service management, `influx setup`, auth/token, org/bucket, write, query, task, backup/restore, retention, and health-check commands are all accurate for InfluxDB 2.x.
- The Python `influxdb-client` examples (Point builder, `SYNCHRONOUS` write options, `query_api`) are correct.
- The Telegraf `[[outputs.influxdb_v2]]` configuration with `urls`, `token`, `organization`, and `bucket` is correct.
- Minor future-proofing note: Flux is in maintenance mode (InfluxData has shifted focus to SQL/InfluxQL in InfluxDB 3.x). For InfluxDB 2.x — the version this post targets — all Flux examples remain valid. The `join()` function used in the multi-measurement example still works in 2.x though the `join` package is the newer recommended approach. No change made since the post explicitly scopes itself to 2.x.

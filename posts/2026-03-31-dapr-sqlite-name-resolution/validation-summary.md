# Validation Summary: How to Configure SQLite Name Resolution in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (self-hosted mode)
- SQLite name resolution component
- Docker Compose with Dapr sidecars
- Service discovery / name resolution

## Sources Consulted
- Dapr official docs — SQLite Name Resolution reference: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-sqlite/
- Dapr official docs — Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr official docs — Supported name resolution components: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr official docs — Self-hosted with Docker: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr official docs — daprd arguments reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr components-contrib source code — `nameresolution/sqlite/sqlite_metadata.go` (default values)
- Dapr components-contrib source code — `nameresolution/sqlite/sqlite_migrations.go` (database schema)

## Issues Found

1. **Wrong resource kind for name resolution config (critical)**: The post used `kind: Component` with `spec.type: nameresolution.sqlite` and a `spec.metadata` list. Dapr name resolution is configured via `kind: Configuration` with `spec.nameResolution.component: "sqlite"` and a flat `configuration` dictionary. Fixed the entire YAML block to use the correct structure.

2. **Wrong default for `timeout`**: Post claimed default is `10s`; actual default is `1s` (per source code constant `defaultTimeout = time.Second`). Fixed in both the configuration example and the parameters table.

3. **Wrong default for `cleanupInterval`**: Post claimed default is `1m`; actual default is `1h` (per source code constant `defaultCleanupInternal = time.Hour`). Fixed in both the configuration example and the parameters table.

4. **Wrong database column names in SQL query**: Post used `appID, address, port, updateTime`. Actual schema columns are `app_id` (snake_case), `address` (includes port as `host:port`), and `last_update` (Unix epoch integer, not ISO timestamp). There is no separate `port` column. Fixed the query and expected output.

5. **Missing `--config` flag in CLI examples**: Since name resolution is in a Configuration file (not a component), the `dapr run` commands need `--config` to point to the config YAML. Added `--config ~/.dapr/config.yaml` to both terminal examples.

6. **Deprecated `--components-path` flag**: The `--components-path` flag is deprecated in favor of `--resources-path`. Updated all CLI examples.

7. **Incorrect Docker Compose architecture**: The post showed application containers directly with a `DAPR_COMPONENTS_PATH` environment variable, missing the required separate `daprd` sidecar containers. Rewrote the Docker Compose example to use the correct pattern with `daprio/daprd` sidecar containers, `network_mode: "service:<app>"`, and proper `--resources-path`/`--config` flags.

8. **Incorrect tuning snippet format**: The tuning example used the old `metadata` list-of-dicts format. Updated to use the correct `spec.nameResolution.configuration` flat dictionary format.

9. **Missing network-access warning for Docker volumes**: Added a note that SQLite name resolution is designed for locally-mounted disks only, and using network-accessed databases (NFS/SMB) is not supported per the official docs.

## Review Notes
- SQLite name resolution is listed as **Alpha** stability in the Dapr docs (as of v1.13+). The post does not mention this; a future update could add a note about the stability level.
- The database schema also includes `registration_id` and `namespace` columns that the post doesn't mention. This is fine for a tutorial-level post.
- Additional configuration parameters exist (`tableName`, `metadataTableName`, `busyTimeout`, `disableWAL`) that the post omits. These are advanced and their omission is acceptable for an introductory tutorial.

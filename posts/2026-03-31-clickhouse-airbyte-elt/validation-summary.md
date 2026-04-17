# Validation Summary: How to Use ClickHouse with Airbyte for ELT

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Airbyte (open-source ELT platform)
- ClickHouse (analytical database)
- Docker Compose / `abctl` (Airbyte local deployment)
- Helm (Airbyte Kubernetes deployment)
- PostgreSQL (as a source connector)
- ClickHouse SQL (DDL, JSON functions, MergeTree family engines, materialized views)
- dbt (with the dbt-clickhouse adapter)
- Airbyte public REST API (curl examples)

## Sources Consulted
- [Airbyte `abctl` deployment docs](https://docs.airbyte.com/platform/deploying-airbyte/abctl)
- [Airbyte Helm Chart V2 (Community)](https://docs.airbyte.com/platform/deploying-airbyte/chart-v2-community)
- [Airbyte 2.0 release notes](https://docs.airbyte.com/release_notes/v-2.0)
- [Airbyte Authentication docs](https://docs.airbyte.com/platform/deploying-airbyte/integrations/authentication)
- [Airbyte ClickHouse destination (legacy)](https://docs.airbyte.com/integrations/destinations/clickhouse)
- [Airbyte ClickHouse V2 destination](https://docs.airbyte.com/integrations/destinations/clickhouse-v2)
- [Airbyte Destinations V2 schema](https://docs.airbyte.com/release_notes/upgrading_to_destinations_v2)
- [Airbyte Public API – createjob reference](https://reference.airbyte.com/reference/createjob)
- [ClickHouse `CREATE USER` reference](https://clickhouse.com/docs/sql-reference/statements/create/user)
- [ClickHouse `GRANT` reference](https://clickhouse.com/docs/sql-reference/statements/grant)
- [ClickHouse JSON functions](https://clickhouse.com/docs/sql-reference/functions/json-functions)
- [ClickHouse MergeTree / ReplacingMergeTree engine docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree)

## Issues Found
1. **Local deployment used the deprecated `run-ab-platform.sh` script.** Replaced the Docker Compose / `run-ab-platform.sh` instructions with `abctl local install`, which is the supported local install path as of Airbyte 2.x. Removed the obsolete `airbyte / password` default credentials and replaced them with `abctl local credentials`, since modern self-hosted Airbyte generates random credentials at install time.
2. **Helm chart pointed at the V1 chart repository.** Updated the `helm repo add` URL from `https://airbytehq.github.io/helm-charts` (V1, no longer supported as of chart v2.1.0) to `https://airbytehq.github.io/charts` and the chart name to `airbyte-v2/airbyte`.
3. **Sync-mode/engine table claimed Full Refresh / Overwrite uses `ReplacingMergeTree`.** Airbyte's ClickHouse destination uses `MergeTree` for overwrite (replacing the table contents each sync). Corrected the engine for that row to `MergeTree` and added an `Incremental / Append + Deduped` row that does map to `ReplacingMergeTree`.
4. **Airbyte API examples used the deprecated internal Configuration API.** Replaced `POST /api/v1/connections/sync` and `POST /api/v1/jobs/list` with the supported public API: `POST /api/public/v1/jobs` (with `jobType: "sync"`) and `GET /api/public/v1/jobs?connectionId=…&jobType=sync`, including the required bearer token header.

## Review Notes
- The post's transformation examples (`JSONExtractUInt`, `JSONExtractString`, `JSONExtractFloat`, `toDateTime(...)`, `MATERIALIZED VIEW … TO target_table`) are valid ClickHouse SQL and reflect the legacy Airbyte ClickHouse connector that lands raw rows into a `_airbyte_data` JSON string column. The newer **ClickHouse V2 (Direct Load) destination** writes typed columns directly into the final table, so `_airbyte_data` does not exist there. Readers using the V2 destination should query the typed columns instead of `JSONExtract*` from `_airbyte_data`. This is worth a follow-up note in a future revision but does not invalidate the legacy-connector workflow shown.
- `CREATE USER … IDENTIFIED WITH plaintext_password` is valid ClickHouse syntax, but for production use `sha256_password` or `bcrypt_password` is preferable; the post correctly stresses using a strong password.
- The raw-table schema is described as "approximate," which is appropriate — newer Destinations V2 raw tables also include `_airbyte_meta` and `_airbyte_generation_id` columns.
- The dbt `profiles.yml` snippet matches the `dbt-clickhouse` adapter's expected fields.

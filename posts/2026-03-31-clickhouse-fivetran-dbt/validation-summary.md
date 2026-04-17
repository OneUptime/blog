# Validation Summary: How to Use ClickHouse with Fivetran and dbt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (analytical database / data warehouse)
- Fivetran (managed ELT connector platform)
- dbt (data build tool) with the `dbt-clickhouse` adapter
- `dbt_utils` package
- Airflow (brief mention, orchestration)
- Stripe (example data source)

## Sources Consulted
- Fivetran ClickHouse destination documentation: https://fivetran.com/docs/destinations/clickhouse
- Fivetran system columns documentation (`_fivetran_synced`, `_fivetran_deleted`): https://fivetran.com/docs/core-concepts/system-columns-and-tables
- ClickHouse HTTP interface (port 8443 for HTTPS): https://clickhouse.com/docs/en/interfaces/http
- ClickHouse `ReplacingMergeTree` engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- dbt-clickhouse adapter (incremental config, `order_by` option): https://github.com/ClickHouse/dbt-clickhouse
- dbt sources documentation: https://docs.getdbt.com/docs/build/sources
- dbt `is_incremental()` and `{{ this }}` macros: https://docs.getdbt.com/docs/build/incremental-models
- dbt-utils `expression_is_true` test: https://github.com/dbt-labs/dbt-utils
- ClickHouse date/datetime arithmetic and `toDateTime`: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions

## Issues Found
No technical issues found.

## Review Notes
- Port 8443 with SSL enabled is the correct HTTPS endpoint for ClickHouse; this matches both self-managed and ClickHouse Cloud defaults.
- The Fivetran metadata columns (`_fivetran_synced`, `_fivetran_deleted`) are accurate; Fivetran also adds `_fivetran_id` on tables without a natural primary key, but that is not needed for the example shown.
- The `dbt-clickhouse` incremental config correctly uses `order_by` (not the generic `unique_key`/`partition_by` from other adapters). The example would also benefit from an explicit `engine='MergeTree()'` in production, but the shown minimal form is valid and picks up adapter defaults.
- The incremental filter `created_at >= (SELECT max(date) FROM {{ this }}) - 1` relies on ClickHouse's `Date - Integer` subtraction semantics (subtract days) and implicit `DateTime` vs `Date` comparison — both are supported, though teams sometimes prefer explicit `subtractDays()` for readability.
- Scheduling via Fivetran's built-in dbt Transformations or an external Airflow webhook are both current, valid options.

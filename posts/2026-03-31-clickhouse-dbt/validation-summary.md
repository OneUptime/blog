# Validation Summary: How to Use ClickHouse with dbt (Data Build Tool)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engines, aggregate functions)
- dbt (dbt-core, Jinja templating, models, tests, macros, sources)
- dbt-clickhouse adapter
- YAML (profiles.yml, dbt_project.yml, schema.yml)
- Python (pip installation)

## Sources Consulted
- dbt-clickhouse GitHub README: https://github.com/ClickHouse/dbt-clickhouse
- ClickHouse dbt integration docs: https://clickhouse.com/docs/integrations/dbt/features-and-configurations
- dbt Developer Hub ClickHouse configs: https://docs.getdbt.com/reference/resource-configs/clickhouse-configs
- dbt seed-paths config reference: https://docs.getdbt.com/reference/project-configs/seed-paths
- ClickHouse network ports guide: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse SQL function reference (toStartOfWeek, dateDiff, JSONExtractString, argMin/argMax, uniq, countIf)

## Issues Found
No technical issues found.

Verified:
- `pip install dbt-clickhouse` is the correct install command.
- Profile fields (type, host, port, schema, user, password, secure, verify, connect_timeout, send_receive_timeout, sync_request_timeout, compress_block_size, compression, driver, custom_settings) are all valid dbt-clickhouse profile options.
- Default ports: HTTP 8123 and HTTPS 8443 are correct.
- Model configs (`+materialized`, `+engine`, `+order_by`, `+partition_by`, `+unique_key`, `+incremental_strategy`) are all valid.
- `delete+insert` is a valid `incremental_strategy` for dbt-clickhouse.
- `seed-paths` is the current (non-deprecated) field name in dbt_project.yml.
- Engine strings `MergeTree()` and `ReplacingMergeTree()` are valid ClickHouse engines usable via dbt-clickhouse `+engine`.
- ClickHouse SQL functions used (`toDate`, `toYYYYMM`, `toStartOfWeek`, `toStartOfDay`, `toStartOfHour`, `toStartOfMonth`, `dateDiff`, `uniq`, `count`, `countIf`, `argMin`, `argMax`, `JSONExtractString`, `today`) are all real ClickHouse functions with correct signatures.
- dbt CLI commands (`dbt init`, `dbt debug`, `dbt run`, `dbt test`, `dbt docs generate`, `dbt docs serve`, `--select`, `--full-refresh`) are all current and correct.
- Jinja macro syntax (`{% macro %}`, `{% endmacro %}`, `{% if %}`, `{% elif %}`, `{% else %}`, `{% endif %}`, `is_incremental()`, `{{ ref() }}`, `{{ source() }}`, `{{ this }}`) is correct dbt/Jinja.

## Review Notes
- The `delete+insert` incremental strategy requires ClickHouse lightweight deletes. On some cluster configurations, users may need to add `use_lw_deletes: true` to the profile or enable `allow_experimental_lightweight_delete=1`. The post doesn't mention this caveat, but the strategy name itself is valid.
- Setting `+engine: "MergeTree()"` at the `staging` level in `dbt_project.yml` is harmless but redundant since those models are materialized as views (views in ClickHouse do not use table engines). dbt-clickhouse safely ignores the engine for view materializations.
- The `retention_cohorts.sql` model has an unusual cohort computation: `toStartOfWeek(min(ts))` grouped by `(user_id, activity_week)` does not produce a true user-cohort (first-ever-week) attribute; it yields the start-of-week of the minimum timestamp within each (user, activity_week) group. The SQL is syntactically valid and runs, but the cohort semantics may not match a traditional first-activity-week cohort analysis. This is a data-modeling nuance rather than a technical error, so no change was made.
- `check_exchange: true` is a legacy dbt-clickhouse profile option used to verify whether the cluster supports `EXCHANGE TABLES`. It is still accepted by the adapter; left as-is.

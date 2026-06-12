# Validation Summary: How to Debug dbt Model Failures

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- dbt (data build tool) v1.7.0
- dbt CLI (run, test, compile, ls, debug, run-operation)
- Jinja templating in dbt models and macros
- SQL (PostgreSQL syntax, with `pg_typeof`, `NULLIF`, `::` cast)
- dbt_utils package (`star` macro)
- dbt incremental materialization (`is_incremental()`, `{{ this }}`)
- dbt artifacts (`run_results.json`, `manifest.json`)
- dbt test `--store-failures` audit schema
- YAML configuration (`dbt_project.yml`)
- Mermaid diagrams
- Python (for parsing dbt artifacts)
- jq (for inspecting JSON artifacts)

## Sources Consulted
- dbt CLI reference: https://docs.getdbt.com/reference/dbt-commands
- dbt node selection syntax: https://docs.getdbt.com/reference/node-selection/syntax
- dbt graph operators (`+`, `n+`): https://docs.getdbt.com/reference/node-selection/graph-operators
- dbt `--store-failures`: https://docs.getdbt.com/reference/resource-configs/store_failures
- dbt incremental models: https://docs.getdbt.com/docs/build/incremental-models
- dbt `is_incremental()` and `{{ this }}`: https://docs.getdbt.com/docs/build/incremental-models#understanding-the-is_incremental-macro
- dbt `run-operation`: https://docs.getdbt.com/reference/commands/run-operation
- dbt artifacts (`run_results.json`, `manifest.json`): https://docs.getdbt.com/reference/artifacts/dbt-artifacts
- dbt context variables (`adapter.get_columns_in_relation`, `target`, `env_var`): https://docs.getdbt.com/reference/dbt-jinja-functions
- dbt_utils `star` macro: https://github.com/dbt-labs/dbt-utils#star-source
- dbt global config `--debug`: https://docs.getdbt.com/reference/global-configs/logs
- PostgreSQL `pg_typeof`, `NULLIF`, cast syntax: https://www.postgresql.org/docs/current/
- dbt 1.7 release notes: https://docs.getdbt.com/docs/dbt-versions/core-upgrade/upgrading-to-v1.7

## Issues Found
No technical issues found.

## Review Notes
- The `--debug` flag is shown placed after the subcommand (e.g., `dbt run --select fct_orders --debug`). The dbt docs canonically recommend `dbt --debug run ...` (global flag before subcommand), but the post's placement is still accepted by the dbt Click-based CLI in 1.5+ and works in practice.
- The example error message blends a dbt "Database Error" wrapper with a "Compilation error:" inner message. This is plausible because some warehouses (notably Snowflake, which reports "SQL compilation error: invalid identifier ...") surface compile-time identifier errors that dbt classifies as Database Errors. The example is illustrative rather than copied from a specific warehouse, which is fine for a tutorial.
- The `analytics_dev_dbt_test__audit.not_null_fct_orders_customer_id` example reflects the default `<target_schema>_dbt_test__audit` schema convention used by `--store-failures`. Worth noting that this can be customized via `store_failures_as` / `schema` config, but the default form shown is correct.
- The post targets dbt 1.7.0 (released November 2023). The CLI surface area used here (selectors, run-operation, store-failures, artifacts) is stable across 1.5–1.9, so the guide remains accurate as of 2026.
- The `pg_typeof` example is Postgres/Redshift-specific. Users on Snowflake/BigQuery would need `SYSTEM$TYPEOF` / `INFORMATION_SCHEMA.COLUMNS` equivalents instead — minor caveat the post could add but not technically incorrect.

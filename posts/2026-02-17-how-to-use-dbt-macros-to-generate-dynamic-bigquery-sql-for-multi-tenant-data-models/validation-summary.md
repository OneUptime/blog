# Validation Summary: Use dbt Macros to Generate Dynamic BigQuery SQL for Multi-Tenant Data Models

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- dbt Core
- dbt Jinja macros
- dbt variables and model configuration
- BigQuery GoogleSQL
- BigQuery views
- BigQuery incremental model configuration

## Sources Consulted
- dbt Jinja and macros documentation: https://docs.getdbt.com/docs/build/jinja-macros
- dbt `run_query` macro documentation: https://docs.getdbt.com/reference/dbt-jinja-functions/run_query
- dbt `execute` variable documentation: https://docs.getdbt.com/reference/dbt-jinja-functions/execute
- dbt `flags` variable documentation: https://docs.getdbt.com/reference/dbt-jinja-functions/flags
- dbt `compile` command documentation: https://docs.getdbt.com/reference/commands/compile
- dbt `run-operation` command documentation: https://docs.getdbt.com/reference/commands/run-operation
- dbt BigQuery configuration documentation: https://docs.getdbt.com/reference/resource-configs/bigquery-configs
- BigQuery dataset naming documentation: https://cloud.google.com/bigquery/docs/datasets
- BigQuery logical views documentation: https://cloud.google.com/bigquery/docs/views
- BigQuery DML and `MERGE` syntax documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery JSON data documentation: https://cloud.google.com/bigquery/docs/json-data

## Issues Found
- The `union_all_tenants` macro selected a generated `tenant_id` column and then selected `*` from a model that was also filtered by `tenant_id`, which could produce duplicate column names when materialized. Changed the select list to `* EXCEPT (tenant_id)` so the generated tenant identifier is the only `tenant_id` column.
- The tenant view macro used tenant IDs such as `acme-corp` directly in BigQuery dataset names. BigQuery dataset IDs cannot contain hyphens, so the snippet now derives `tenant_dataset` by replacing hyphens with underscores before appending `_views`.
- The tenant view macro executed `run_query` without scoping the command context. dbt documents that `run_query` can execute during compile-like workflows with a live connection, so the snippet now guards side-effecting DDL with `flags.WHICH == 'run-operation'`.
- The all-tenant view macro invoked a side-effecting macro with `{{ ... }}` expression syntax. Changed it to `{% do ... %}` to call the macro without emitting output into compiled SQL.
- The text said the view macro could be run by hook or run-operation, but the corrected side-effect guard intentionally scopes execution to `dbt run-operation`. Updated the sentence accordingly.
- The `tenant_incremental_filter` macro accepted `lookback_hours` but did not use it. Updated the filter to apply `TIMESTAMP_SUB(..., INTERVAL {{ lookback_hours }} HOUR)` to the current max timestamp.
- The BigQuery utility macro comment called a partition filter a "hint." BigQuery uses the expression as a pruning predicate rather than a SQL hint, so the comment now says "partition pruning predicates."

## Review Notes
The examples are illustrative and assume referenced models, tables, datasets, and JSON columns exist with the shown schemas. For production use, tenant IDs and generated column names should be validated or quoted consistently before being inserted into SQL identifiers.

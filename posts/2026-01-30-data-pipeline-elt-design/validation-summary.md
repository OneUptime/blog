# Validation Summary: How to Create ELT Pipeline Design

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- ELT and ETL pipeline architecture
- dbt project configuration, models, tests, macros, source freshness, and CLI commands
- dbt-utils package macros and tests
- Snowflake-style SQL for warehouse transformations
- Data warehouse medallion architecture
- Incremental models and merge strategies
- Bash pipeline orchestration

## Sources Consulted
- dbt `dbt_project.yml` reference: https://docs.getdbt.com/reference/dbt_project.yml
- dbt project configuration reference: https://docs.getdbt.com/category/project-configs
- dbt source freshness property reference: https://docs.getdbt.com/reference/resource-properties/freshness
- dbt data tests guide: https://docs.getdbt.com/docs/build/data-tests
- dbt data tests property reference: https://docs.getdbt.com/reference/resource-properties/data-tests
- dbt incremental models guide: https://docs.getdbt.com/docs/build/incremental-models
- dbt incremental strategy reference: https://docs.getdbt.com/docs/build/incremental-strategy
- dbt materializations reference: https://docs.getdbt.com/reference/resource-configs/materialized
- dbt Snowflake configuration reference: https://docs.getdbt.com/reference/resource-configs/snowflake-configs
- dbt BigQuery configuration reference: https://docs.getdbt.com/reference/resource-configs/bigquery-configs
- dbt command reference: https://docs.getdbt.com/reference/dbt-commands
- dbt source command reference: https://docs.getdbt.com/reference/commands/source
- dbt node selection syntax: https://docs.getdbt.com/reference/node-selection/syntax
- dbt-utils package documentation: https://github.com/dbt-labs/dbt-utils
- Snowflake `DATEDIFF` documentation: https://docs.snowflake.com/en/sql-reference/functions/datediff
- Snowflake `DATEADD` documentation: https://docs.snowflake.com/en/sql-reference/functions/dateadd
- Snowflake `BOOLOR_AGG` documentation: https://docs.snowflake.com/en/sql-reference/functions/boolor_agg
- Snowflake `EXTRACT` documentation: https://docs.snowflake.com/en/sql-reference/functions/extract
- Snowflake `TIMESTAMP_TZ` documentation: https://docs.snowflake.com/en/sql-reference/data-types-datetime
- Snowflake `QUALIFY` documentation: https://docs.snowflake.com/en/sql-reference/constructs/qualify

## Issues Found
- The project tree referenced `country_codes.csv`, but the orders staging model used `ref('seed_exchange_rates')`. Updated the tree to include `seed_exchange_rates.csv`.
- The examples used `dbt_utils.generate_surrogate_key`, `dbt_utils.date_spine`, and `dbt_utils.expression_is_true` without declaring the package. Added a `packages.yml` snippet for `dbt-labs/dbt_utils`.
- The source freshness example used older top-level freshness fields. Updated the example to place `freshness` and `loaded_at_field` under `config`, matching current dbt guidance.
- Several SQL snippets mixed Snowflake-specific syntax with PostgreSQL-style timestamp and interval calculations. Updated timestamp casts, date differences, date arithmetic, and day-of-week extraction to Snowflake-compatible forms.
- The intermediate model used `bool_or`, which is not the Snowflake boolean aggregate function. Replaced it with `boolor_agg`.
- Mart model examples included `post_hook` statements with `analyze {{ this }}`, which is not portable to Snowflake and would be invalid in that context. Removed those hooks.
- The fact table used `cluster_by=['ordered_at::date']` while selecting `order_date` as the date column. Updated the clustering key to `order_date`.
- The events incremental model mixed Snowflake SQL with a BigQuery-style `partition_by` config. Removed `partition_by` and clustered by `event_date`, `event_type`, and `user_id` instead.
- The events incremental lookback could return no rows if the existing table contained only null timestamps. Added a `coalesce` fallback.
- The product incremental model compared source `updated_at` to `_dbt_updated_at`, which could miss valid source changes. Updated the predicate to compare against `max(updated_at)` from the target table.
- The product incremental `merge_update_columns` omitted columns that are calculated from mutable source fields. Added `subcategory`, `cost_usd`, `margin_usd`, and `updated_at`.
- The customer aggregation filtered out cancelled orders while still computing `cancelled_orders`, which made that metric always zero. Removed the filter and made revenue metrics exclude cancelled orders explicitly.
- The fact table comment claimed customer attributes were "at time of order" even though the model joins current `dim_customers`. Updated the comment to describe current customer attributes.
- The YAML test examples used legacy argument placement for parameterized tests. Updated `accepted_values`, `relationships`, and `dbt_utils.expression_is_true` examples to nest parameters under `arguments`.
- The pipeline script used unqualified selectors such as `--select staging` and `--select marts`. Updated them to explicit path selectors.

## Review Notes
The SQL examples are now internally consistent with Snowflake-style dbt usage. Teams using BigQuery, Redshift, Postgres, Databricks, or DuckDB would still need to adapt warehouse-specific syntax and configs.

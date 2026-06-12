# Validation Summary: How to Configure dbt Incremental Models

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- dbt incremental models
- dbt Jinja macros and model configuration
- dbt incremental strategies: append, merge, delete+insert, insert_overwrite
- dbt unique_key, merge_update_columns, and on_schema_change configuration
- dbt CLI full-refresh behavior
- SQL date arithmetic across data warehouses
- BigQuery, Snowflake, and Redshift-oriented incremental modeling considerations

## Sources Consulted
- dbt incremental models: https://docs.getdbt.com/docs/build/incremental-models
- dbt incremental strategies: https://docs.getdbt.com/docs/build/incremental-strategy
- dbt unique_key configuration: https://docs.getdbt.com/reference/resource-configs/unique_key
- dbt BigQuery configurations and supported incremental strategies: https://docs.getdbt.com/reference/resource-configs/bigquery-configs
- dbt run command and --full-refresh behavior: https://docs.getdbt.com/reference/commands/run
- dbt full_refresh resource config: https://docs.getdbt.com/reference/resource-configs/full_refresh
- dbt flags Jinja variable: https://docs.getdbt.com/reference/dbt-jinja-functions/flags
- dbt run_started_at Jinja variable: https://docs.getdbt.com/reference/dbt-jinja-functions/run_started_at
- dbt cross-database dateadd macro: https://docs.getdbt.com/reference/dbt-jinja-functions/cross-database-macros
- dbt-utils generate_surrogate_key macro: https://github.com/dbt-labs/dbt-utils

## Issues Found
- Clarified that an incremental strategy controls how dbt applies incremental results to the target table, while the model's `is_incremental()` filter identifies which source rows are processed.
- Replaced generic `dateadd(...)` examples with dbt's cross-database `dbt.dateadd(...)` macro where the article presents warehouse-agnostic examples. Plain `dateadd` is valid on some warehouses, such as Snowflake and Redshift, but not portable to BigQuery.
- Narrowed the `unique_key` explanation to strategies such as `merge` and `delete+insert`, because not all incremental strategies use `unique_key`; `insert_overwrite` operates on partitions instead.
- Changed the merge strategy description from "default for most warehouses" to "a common default on several warehouses" because defaults and supported strategies vary by adapter.
- Corrected the partition replacement example from `delete+insert` to `insert_overwrite` and removed `unique_key` from that example. The previous snippet combined BigQuery-style `partition_by` syntax with `delete+insert`, which is not a supported BigQuery incremental strategy.
- Corrected the best-practice recommendation that said to use `delete+insert` for partition replacement. Partition replacement should use `insert_overwrite` where supported; `delete+insert` is row replacement based on a unique key.
- Corrected the "Scheduled Full Refresh" example. The Jinja condition only reprocesses all source rows through the configured incremental strategy; it does not perform a true dbt full refresh because dbt does not drop and rebuild the target table without `--full-refresh` or an applicable `full_refresh` config.
- Replaced `modules.datetime.datetime.now()` with `run_started_at.day` in the scheduled reprocessing example, using dbt's documented run timestamp variable.
- Adjusted the best-practice guidance from "Always set unique_key" to setting `unique_key` for upserts and row replacement, since append-only and partition-overwrite strategies may not require or use it.

## Review Notes
The examples still assume representative column names and source definitions. The `dbt_utils.generate_surrogate_key` example requires the dbt-utils package to be installed in a real project. Some SQL remains adapter-specific by design, such as the BigQuery `date_sub(current_date(), interval 2 day)` expression in the BigQuery-style `insert_overwrite` partition example.

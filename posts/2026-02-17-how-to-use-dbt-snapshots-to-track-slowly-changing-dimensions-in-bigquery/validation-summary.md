# Validation Summary: How to Use dbt Snapshots to Track Slowly Changing Dimensions in BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- dbt snapshots
- dbt Core snapshot configuration
- dbt CLI
- dbt-utils
- BigQuery / GoogleSQL
- Apache Airflow / Cloud Composer orchestration
- Slowly Changing Dimensions Type 2

## Sources Consulted
- dbt snapshots documentation: https://docs.getdbt.com/docs/build/snapshots
- dbt snapshot command reference: https://docs.getdbt.com/reference/commands/snapshot
- dbt snapshot configurations reference: https://docs.getdbt.com/reference/snapshot-configs
- dbt `hard_deletes` snapshot config: https://docs.getdbt.com/reference/resource-configs/hard-deletes
- dbt `invalidate_hard_deletes` legacy config: https://docs.getdbt.com/reference/resource-configs/invalidate_hard_deletes
- dbt `schema` config: https://docs.getdbt.com/reference/resource-configs/schema
- dbt `target_schema` snapshot config: https://docs.getdbt.com/reference/resource-configs/target_schema
- dbt BigQuery configurations: https://docs.getdbt.com/reference/resource-configs/bigquery-configs
- BigQuery GoogleSQL timestamp literal reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/lexical#timestamp_literals
- dbt-utils package documentation: https://hub.getdbt.com/dbt-labs/dbt_utils/latest/

## Issues Found
- Replaced `target_schema='snapshots'` with `schema='snapshots'` in snapshot examples and updated the related config explanation. dbt Core v1.9+ documentation says `target_schema` is no longer used for current snapshot configuration and points users to `schema`.
- Replaced `invalidate_hard_deletes=True` with `hard_deletes='invalidate'` in new snapshot examples and updated the related prose. Current dbt documentation marks `invalidate_hard_deletes` as legacy and recommends `hard_deletes` for new snapshots.
- Corrected the first snapshot comment from `check_cols` change detection to `updated_at` change detection because the example uses the timestamp strategy, not the check strategy.
- Corrected the first-run metadata description. dbt snapshot tables include `dbt_valid_from`, `dbt_valid_to`, `dbt_scd_id`, and `dbt_updated_at`, not only the two validity timestamp columns.
- Changed the BigQuery point-in-time filter to use explicit `TIMESTAMP` literals instead of untyped date strings.
- Updated the dbt-utils test comment. `dbt_utils.unique_combination_of_columns` verifies uniqueness of the listed column combination; it does not prove non-overlapping validity intervals.

## Review Notes
- The post still uses SQL-file snapshot definitions, which dbt now documents as a legacy method in dbt Core v1.9+ while recommending YAML snapshot definitions for new snapshots. The SQL form remains documented, so this was noted rather than fully restructuring the tutorial.
- The `dbt_utils.generate_surrogate_key` and `dbt_utils.unique_combination_of_columns` examples require the `dbt_utils` package to be installed in the dbt project.

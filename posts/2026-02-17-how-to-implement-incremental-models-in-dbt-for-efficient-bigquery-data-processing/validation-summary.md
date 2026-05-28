# Validation Summary: How to Use Incremental Models in dbt for Efficient BigQuery Data Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- dbt incremental models
- dbt BigQuery adapter
- BigQuery / GoogleSQL
- dbt CLI
- dbt-utils tests

## Sources Consulted
- dbt documentation: Configure incremental models - https://docs.getdbt.com/docs/build/incremental-models
- dbt documentation: About incremental strategy - https://docs.getdbt.com/docs/build/incremental-strategy
- dbt documentation: BigQuery configurations - https://docs.getdbt.com/reference/resource-configs/bigquery-configs
- dbt documentation: dbt run command - https://docs.getdbt.com/reference/commands/run
- dbt documentation: unique_key - https://docs.getdbt.com/reference/resource-configs/unique_key
- Google Cloud documentation: BigQuery GoogleSQL query syntax - https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- dbt-utils documentation: recency generic test - https://github.com/dbt-labs/dbt-utils#recency

## Issues Found
- Clarified the `is_incremental()` explanation to include all documented conditions: the relation exists, the model is incremental, and `--full-refresh` was not passed.
- Changed wording that said every subsequent incremental run "merges" data. dbt applies data using the configured incremental strategy, which may be merge, append, or insert overwrite.
- Fixed BigQuery SQL snippets that referenced the `event_date` SELECT alias in the `WHERE` clause. GoogleSQL SELECT aliases are not visible to `WHERE`, so the examples now repeat `CAST(event_timestamp AS DATE)` in the filter.
- Adjusted `insert_overwrite` wording. dbt's BigQuery implementation can still use a MERGE statement internally, but it replaces partitions rather than doing row-by-row `unique_key` matching.
- Updated the dbt-utils `recency` test example to the current `arguments:` syntax and corrected the comment from checking date-range gaps to checking that recent data is present.
- Softened "always include a lookback window" to apply specifically when late-arriving data must be handled.

## Review Notes
The examples are intentionally schematic and assume the referenced staging models expose the named columns. The post does not pin a dbt or dbt-bigquery version; the review used the current official docs available on 2026-05-28.

# Validation Summary: How to Reduce BigQuery Costs by Optimizing Query Patterns and Table Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud BigQuery
- GoogleSQL
- BigQuery partitioned tables
- BigQuery clustered tables
- BigQuery materialized views
- BigQuery INFORMATION_SCHEMA
- bq command-line tool

## Sources Consulted
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- BigQuery best practices for controlling costs: https://cloud.google.com/bigquery/docs/best-practices-costs
- BigQuery best practices for optimizing query computation: https://cloud.google.com/bigquery/docs/best-practices-performance-compute
- BigQuery partition filter requirements: https://cloud.google.com/bigquery/docs/managing-partitioned-tables
- BigQuery clustered tables: https://cloud.google.com/bigquery/docs/clustered-tables
- BigQuery materialized views introduction: https://cloud.google.com/bigquery/docs/materialized-views-intro
- BigQuery materialized view creation and limitations: https://cloud.google.com/bigquery/docs/materialized-views-create
- BigQuery aggregate functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions
- BigQuery HLL++ and approximate aggregation behavior: https://cloud.google.com/bigquery/docs/reference/standard-sql/hll_functions
- BigQuery table expiration: https://cloud.google.com/bigquery/docs/managing-tables
- BigQuery dataset default expiration: https://cloud.google.com/bigquery/docs/updating-datasets
- BigQuery INFORMATION_SCHEMA.JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs

## Issues Found
- The materialized view example used `COUNT(DISTINCT user_id)`, which is not in the supported aggregate list for standard BigQuery materialized views. Changed it to `APPROX_COUNT_DISTINCT(user_id)`.
- The materialized view explanation described results as being served from cache and implied automatic use for all matching patterns. Updated the wording to describe stored precomputed results and BigQuery smart tuning requirements.
- The CTE section claimed CTEs read data once and can be referenced multiple times without repeated scans. BigQuery documentation states there is no guarantee that a `WITH` clause materializes and reuses results. Updated the explanation while keeping the example focused on a single aggregation pass.
- The approximate aggregation section implied lower bytes processed and gave a specific typical error range. Updated it to reflect the documented memory/compute tradeoff and statistical error without an unsupported fixed accuracy claim.
- The long-term storage section implied appending to any table preserves long-term pricing for old data. BigQuery long-term storage applies separately to partitions only for partitioned tables; modifications reset the timer for the modified table or partition. Updated the wording and comments.
- The INFORMATION_SCHEMA cost query estimated cost from `total_bytes_processed` and did not exclude script parent jobs. Updated it to use `total_bytes_billed`, filter failed jobs, and exclude `statement_type = 'SCRIPT'`.

## Review Notes
The remaining examples are syntactically consistent with GoogleSQL and current BigQuery DDL patterns. The cost estimate still uses a sample on-demand price and should be adjusted for the user's BigQuery region and billing model.

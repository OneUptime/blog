# Validation Summary: How to Implement Change Data Capture Tracking in BigQuery Using Table Snapshots

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- BigQuery time travel
- BigQuery table snapshots
- BigQuery scheduled queries
- GoogleSQL
- BigQuery JSON functions
- BigQuery command-line tool
- Bash

## Sources Consulted
- BigQuery time travel documentation: https://docs.cloud.google.com/bigquery/docs/time-travel
- BigQuery query syntax reference for `FOR SYSTEM_TIME AS OF`: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- BigQuery table snapshot creation documentation: https://docs.cloud.google.com/bigquery/docs/table-snapshots-create
- BigQuery table snapshots introduction and limitations: https://cloud.google.com/bigquery/docs/table-snapshots-intro
- BigQuery scheduled queries documentation: https://docs.cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery Job API copy operation types: https://docs.cloud.google.com/bigquery/docs/reference/rest/v2/Job
- BigQuery JSON functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- BigQuery operators reference for `IS DISTINCT FROM`: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/operators
- BigQuery Data Transfer `TransferConfig` schedule reference: https://docs.cloud.google.com/bigquery/docs/reference/datatransfer/rest/v1/projects.locations.transferConfigs

## Issues Found
- The post described the time travel window as always seven days. BigQuery time travel is seven days by default, but it is configurable from two to seven days, so the wording and diagram were updated.
- The original time travel comparison queries referenced the same table at the current time and a historical time in one statement. BigQuery does not allow a single query statement to reference one table at multiple points in time, including current and historical. The examples now materialize the current table into a temporary table before comparing it to the historical table.
- The original `FOR SYSTEM_TIME AS OF` aliases were placed after the time travel clause. GoogleSQL syntax places the table alias before `FOR SYSTEM_TIME AS OF`, so the examples were corrected.
- The field-by-field update example used `!=`, which misses changes involving `NULL`. It now uses `IS DISTINCT FROM` for null-safe change detection.
- The scheduled CDC command used an empty `--destination_table`. BigQuery scheduled query examples require `--destination_table` or `--target_dataset`; the command now uses `--target_dataset="analytics"` for the DML script.
- The Cloud Scheduler snapshot example used a static `customers_YYYYMMDD` table ID, which would not create date-suffixed tables automatically and would fail after the first run. It was replaced with a BigQuery scheduled query using `EXECUTE IMMEDIATE` and `FORMAT_DATE`.
- The full change-log example defined `old_values` and `new_values` as `JSON` but selected `TO_JSON_STRING(...)` values. The example now uses `TO_JSON(...)` for JSON-typed output while retaining `TO_JSON_STRING(...)` for the JavaScript UDF input.

## Review Notes
- The snapshot cleanup Bash example assumes GNU tools such as `date -d` and `grep -P`; it is suitable for common Linux environments such as Cloud Shell but is not portable to every shell environment without adjustment.
- The JSON-string whole-row comparison approach is practical for examples, but production CDC systems may prefer explicit per-column comparison or hashes over canonicalized column sets for tighter control over schema changes and nested data behavior.

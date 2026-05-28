# Validation Summary: How to Handle Schema Evolution in BigQuery When Source Schemas Change Frequently

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery
- GoogleSQL
- bq CLI
- BigQuery JSON data type and JSON functions
- BigQuery INFORMATION_SCHEMA
- dbt

## Sources Consulted
- Google Cloud BigQuery documentation: Modifying table schemas: https://docs.cloud.google.com/bigquery/docs/managing-table-schemas
- Google Cloud BigQuery documentation: LOAD DATA statements in GoogleSQL: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/load-statements
- Google Cloud BigQuery documentation: Batch loading data: https://docs.cloud.google.com/bigquery/docs/batch-loading-data
- Google Cloud BigQuery documentation: JSON functions: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- Google Cloud BigQuery documentation: Function calls and SAFE prefix: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/functions-reference
- Google Cloud BigQuery documentation: Legacy streaming API: https://docs.cloud.google.com/bigquery/docs/streaming-data-into-bigquery
- Google Cloud BigQuery documentation: Storage Write API overview: https://docs.cloud.google.com/bigquery/docs/write-api
- dbt Developer Hub: source function: https://docs.getdbt.com/reference/dbt-jinja-functions/source
- dbt Developer Hub: Staging project structure: https://docs.getdbt.com/best-practices/how-we-structure/2-staging

## Issues Found
- The post claimed automatic field addition works with load jobs and streaming inserts. Current BigQuery schema update options apply to append load jobs and query jobs, while streaming APIs do not use the shown `--schema_update_option` behavior. Updated the wording to append load jobs.
- The `bq load` field-addition example omitted `--noreplace`, which the official examples use to make append behavior explicit. Added `--noreplace`.
- The `LOAD DATA` example used a non-existent `WITH SCHEMA MODIFICATIONS (ALLOW_FIELD_ADDITION)` clause. Replaced it with a valid `LOAD DATA OVERWRITE` example and clarified that append schema update options are configured on load jobs.
- The column relaxation `bq load` example did not show the relaxed schema file needed for CSV or JSON load jobs. Added `--noreplace` and `./relaxed_schema.json`.
- The defensive SQL section described columns as missing in older data, but BigQuery queries cannot reference a column that is absent from the table schema. Reworded this as newly added columns that are NULL for historical rows.
- The JSON access example used `SAFE.STRING(JSON_QUERY(...))` for scalar extraction from a JSON string column. Replaced it with `JSON_VALUE(...)`, which directly extracts a scalar SQL string.
- The post said BigQuery does not support direct column renames. Current BigQuery supports `ALTER TABLE ... RENAME COLUMN`. Updated the section and added the direct rename DDL while preserving the add-and-backfill migration option.
- The post said BigQuery cannot change a column type in place. Current BigQuery supports some in-place type changes with `ALTER COLUMN SET DATA TYPE`, but incompatible changes such as STRING to INT64 still require a new column or table rewrite. Updated the explanation.
- The JSON catch-all pattern said source schema changes never break ingestion and raw data always lands successfully. Reworded this to avoid overpromising, since malformed JSON, invalid required fields, or other load errors can still fail ingestion.

## Review Notes
The remaining examples are illustrative and assume the referenced old and new columns both exist during transition windows. In production, schema drift detection should also account for mode differences and nested fields if those are important to the source contract.

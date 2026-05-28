# Validation Summary: How to Use Slowly Changing Dimensions in BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- GoogleSQL
- BigQuery DML and MERGE statements
- BigQuery partitioned and clustered tables
- BigQuery scheduled queries and bq CLI
- Slowly changing dimension data modeling

## Sources Consulted
- BigQuery GoogleSQL DML syntax: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery GoogleSQL DDL syntax: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery GoogleSQL operators: https://cloud.google.com/bigquery/docs/reference/standard-sql/operators
- BigQuery GoogleSQL hash functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/hash_functions
- BigQuery GoogleSQL JSON functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- BigQuery partitioned tables: https://cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery querying partitioned tables: https://cloud.google.com/bigquery/docs/querying-partitioned-tables
- BigQuery querying clustered tables: https://cloud.google.com/bigquery/docs/querying-clustered-tables
- BigQuery scheduled queries: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery Data Transfer Service TransferConfig schedule field: https://cloud.google.com/bigquery/docs/reference/datatransfer/rest/v1/projects.locations.transferConfigs

## Issues Found
- Nullable column comparisons in the Type 1 and Type 3 MERGE examples used `!=`, which can return `NULL` instead of `TRUE` when one side is `NULL`. Changed these comparisons to `IS DISTINCT FROM`, which is BigQuery's null-safe distinctness operator.
- The Type 2 change detection hash concatenated nullable fields with `COALESCE(..., '')`, which could treat `NULL` and empty string as equivalent and could blur column boundaries. Changed the hash input to `TO_JSON_STRING(STRUCT(...))` so nulls and field boundaries are preserved before applying `MD5`.
- The Type 2 hash comparison used `!=`, which is not null-safe. Changed it to `IS DISTINCT FROM`.
- The partitioning explanation claimed that `WHERE is_current = TRUE` only scans partitions where rows were last modified. BigQuery partition pruning requires a qualifying filter on the partitioning column, so the text now distinguishes partition pruning on `effective_from` from clustering benefits on `is_current`.
- The scheduling command used cron syntax for `--schedule` and omitted a target dataset. Updated it to the documented scheduled-query format, `--schedule="every day 04:00"`, and added `--target_dataset=warehouse` for the DML scheduled query.
- The performance optimization SQL snippet contained `...` inside a SQL code block. Replaced it with concrete column definitions so the snippet is syntactically valid GoogleSQL.

## Review Notes
The examples assume that the staging table has at most one row per `customer_id` for each run. BigQuery MERGE statements that update or delete a target row can fail if multiple source rows match the same target row, so production pipelines should deduplicate or otherwise enforce source-key uniqueness before running these statements. The local environment did not have the `bq` CLI installed, so CLI verification was performed against official Google Cloud documentation rather than local `bq --help` output.

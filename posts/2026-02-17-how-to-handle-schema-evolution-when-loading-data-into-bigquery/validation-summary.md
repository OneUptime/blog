# Validation Summary: How to Handle Schema Evolution When Loading Data into BigQuery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery
- GoogleSQL DDL
- BigQuery load jobs
- BigQuery command-line tool
- Python BigQuery client library
- Parquet, Avro, and ORC schema inference
- BigQuery JSON data type and JSON functions

## Sources Consulted
- BigQuery: Modifying table schemas: https://cloud.google.com/bigquery/docs/managing-table-schemas
- BigQuery: GoogleSQL data definition language statements: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery REST API JobConfigurationLoad schemaUpdateOptions: https://cloud.google.com/bigquery/docs/reference/rest/v2/Job#JobConfigurationLoad
- BigQuery: Schema auto-detection: https://cloud.google.com/bigquery/docs/schema-detect
- Python BigQuery client LoadJobConfig reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.job.LoadJobConfig
- Python BigQuery client SchemaUpdateOption reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.enums.SchemaUpdateOption
- BigQuery: Working with JSON data: https://cloud.google.com/bigquery/docs/json-data
- BigQuery: JSON functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions

## Issues Found
- The post described Parquet schema changes as "Automatic with auto-detect" and used `--autodetect` with `--source_format=PARQUET`. BigQuery schema auto-detection is for CSV, JSON, and Google Sheets; Parquet, Avro, and ORC are self-describing and BigQuery infers their schemas from the files. I updated the wording and removed `--autodetect` from the Parquet load command.
- The post stated that BigQuery does not support changing a column type directly with `ALTER TABLE`. BigQuery supports limited widening conversions with `ALTER COLUMN SET DATA TYPE`, such as `INT64` to `NUMERIC`, `BIGNUMERIC`, or `FLOAT64`. I updated the explanation to preserve the workaround guidance for unsupported changes like `STRING` to `INT64`.
- The post said existing rows get NULL values when new columns are added. That is only valid for nullable added fields. I updated the wording to specify nullable columns.
- The removed-column section implied missing source fields always load as NULL. I clarified that this applies to nullable fields in named or self-describing formats and that required missing fields still fail.
- The Python schema evolution handler treated all mode changes as safe and could return success for additions before checking type changes. I updated the sample so it rejects required top-level additions, rejects unsupported mode changes, allows only REQUIRED-to-NULLABLE relaxation, and checks type changes before returning success.
- The Python sample imported unused `storage` and `json` modules. I removed the unused imports.
- The best practices section said to always enable `ALLOW_FIELD_ADDITION` and never change column types in place. I adjusted these to reflect that `ALLOW_FIELD_ADDITION` applies when expected nullable fields may be added, and that in-place type changes are appropriate only for BigQuery's supported widening conversions.

## Review Notes
The local environment did not have the `bq` CLI installed, so CLI flag validation was performed against official Google Cloud documentation rather than local `bq --help` output. No version-specific claims were made in the post.

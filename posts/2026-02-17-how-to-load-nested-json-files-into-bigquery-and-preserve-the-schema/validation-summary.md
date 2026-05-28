# Validation Summary: How to Load Nested JSON Files into BigQuery and Preserve the Schema

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery bq command-line tool
- GoogleSQL
- Newline-delimited JSON
- Python
- google-cloud-bigquery Python client
- Cloud Storage
- jq
- gsutil

## Sources Consulted
- BigQuery loading JSON data from Cloud Storage: https://docs.cloud.google.com/bigquery/docs/loading-data-cloud-storage-json
- BigQuery LOAD DATA statement reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/load-statements
- BigQuery nested and repeated columns: https://docs.cloud.google.com/bigquery/docs/nested-repeated
- BigQuery schema auto-detection: https://docs.cloud.google.com/bigquery/docs/schema-detect
- BigQuery bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery clustered table requirements: https://docs.cloud.google.com/bigquery/docs/clustered-tables
- BigQuery INFORMATION_SCHEMA.COLUMNS view: https://docs.cloud.google.com/bigquery/docs/information-schema-columns
- BigQuery INFORMATION_SCHEMA.COLUMN_FIELD_PATHS view: https://cloud.google.com/bigquery/docs/information-schema-column-field-paths
- google-cloud-bigquery LoadJobConfig reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.job.LoadJobConfig

## Issues Found
- The hybrid schema section said deep nesting would be stored as JSON strings, but the example correctly used BigQuery's native JSON type. Changed the wording and inline SQL comment to say JSON columns / JSON.
- The partitioned load example used `--time_partitioning_field=event_date`, but the article's schema does not define an `event_date` column. Changed it to the existing `timestamp` field.
- The same load example used `--clustering_fields=user.id`, but BigQuery clustering columns must be top-level, non-repeated columns. Changed it to `event_id`, which is a top-level STRING field.

## Review Notes
The examples are otherwise consistent with current BigQuery documentation: JSON loads use newline-delimited JSON, nested objects map to RECORD/STRUCT fields, arrays map to repeated fields, `LOAD DATA` supports JSON files, and the Python client code uses current `LoadJobConfig` and `load_table_from_uri` APIs. For more detailed nested schema inspection, `INFORMATION_SCHEMA.COLUMN_FIELD_PATHS` can complement the `INFORMATION_SCHEMA.COLUMNS` queries already shown.

# Validation Summary: How to Fix BigQuery Export to Cloud Storage Failing with Exceeded Maximum File

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google BigQuery
- Google Cloud Storage
- bq command-line tool
- GoogleSQL EXPORT DATA
- Python BigQuery client library
- Python Cloud Storage client library
- pandas

## Sources Consulted
- Google Cloud BigQuery export table data to Cloud Storage: https://cloud.google.com/bigquery/docs/exporting-data
- Google Cloud BigQuery EXPORT DATA statement reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/export-statements
- Google Cloud BigQuery quotas and limits for extract jobs: https://cloud.google.com/bigquery/quotas
- Google Cloud BigQuery partitioned tables documentation: https://cloud.google.com/bigquery/docs/partitioned-tables
- Google Cloud Python BigQuery ExtractJobConfig reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.job.ExtractJobConfig
- Google Cloud Python BigQuery ExtractJob reference: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.job.ExtractJob

## Issues Found
- The post described the BigQuery export limit as a per-file 1 GB limit for CSV, JSON, Avro, and Parquet. Google documents this as a 1 GB table data limit for a single destination file, with sharded output file sizes varying and sometimes exceeding 1 GB. Updated the limit explanation to match the documented behavior.
- The post said wildcard exports can export tables of any size. BigQuery extract jobs are still subject to quotas, including daily extracted bytes and job limits. Updated the wording to say wildcard exports scale to large tables within BigQuery's export quotas.
- The decision tree implied single-file export was generally valid for all export methods under 1 GB. Google documents that `EXPORT DATA` requires a single wildcard URI, while single destination URIs are supported for extract jobs. Updated the decision tree node to distinguish `bq extract` from `EXPORT DATA`.
- The compression ratio claim was too absolute. Compression varies by data shape, column values, and format. Reworded it to avoid promising a fixed 5-10x range.
- The Python example printed `destination_uri_file_counts` as "Bytes transferred". That property reports output file counts, not transferred bytes. Updated the label.
- The date-loop script excluded the configured `END_DATE`. Updated the loop condition so the stated date range includes the end date.

## Review Notes
The `bq` CLI was not installed locally, so command validation was performed against official Google Cloud documentation rather than local `bq --help` output. The examples use GNU `date -d`, which is suitable for common Linux environments such as Cloud Shell but would need adjustment on macOS.

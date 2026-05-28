# Validation Summary: How to Fix BigQuery Schema Mismatch Errors When Loading Data from Cloud Storage

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google BigQuery
- Google Cloud Storage
- BigQuery bq command-line tool
- CSV, newline-delimited JSON, Parquet, and Avro loading
- GoogleSQL SAFE_CAST
- Python google-cloud-storage client library
- PyArrow Parquet schema inspection

## Sources Consulted
- Google Cloud BigQuery bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud BigQuery CSV loading documentation: https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-csv
- Google Cloud BigQuery JSON loading documentation: https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-json
- Google Cloud BigQuery schema auto-detection documentation: https://cloud.google.com/bigquery/docs/schema-detect
- Google Cloud BigQuery schema specification documentation: https://cloud.google.com/bigquery/docs/schemas
- Google Cloud BigQuery nested and repeated fields documentation: https://cloud.google.com/bigquery/docs/nested-repeated
- Google Cloud BigQuery Parquet loading documentation: https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-parquet
- Google Cloud BigQuery table schema modification documentation: https://cloud.google.com/bigquery/docs/managing-table-schemas

## Issues Found
- JSON field-name mismatch behavior was overstated as loading NULL by default. BigQuery treats unrecognized JSON fields as unknown values unless `--ignore_unknown_values` is enabled, so I clarified when the row fails and when the missing schema field becomes NULL.
- The Parquet section incorrectly described INT32 versus INT64 as a common mismatch. BigQuery maps Parquet INT32 to INT64, so I replaced that with accurate Parquet mismatch cases involving BYTE_ARRAY annotations, timestamp logical annotations, and decimal compatibility.
- The Parquet load example recommended `--autodetect`. BigQuery automatically retrieves schemas from self-describing formats such as Parquet and Avro, so I removed `--autodetect` from the Parquet example and adjusted related guidance.
- The append examples used `--write_disposition=WRITE_APPEND`, which is not the documented `bq load` pattern. I changed the examples to use `--noreplace`, matching Google Cloud's schema-update load-job guidance.
- The schema-update append example did not provide a way for BigQuery to discover the added JSON fields. I added `--autodetect`, which is required for CSV/JSON schema additions unless a JSON schema file containing the new fields is supplied.
- The debugging flowchart and summary implied auto-detection should be used for Parquet/Avro. I changed that guidance to checking the embedded schema and limited auto-detect recommendations to CSV and JSON.
- The `--allow_jagged_rows` explanation was too broad. I clarified that it applies to missing trailing optional CSV columns.

## Review Notes
The remaining examples are technically valid as illustrative commands, but production pipelines should also consider dataset and bucket location compatibility, explicit schema files for repeatability, and `--location` for multi-region or regional BigQuery jobs.

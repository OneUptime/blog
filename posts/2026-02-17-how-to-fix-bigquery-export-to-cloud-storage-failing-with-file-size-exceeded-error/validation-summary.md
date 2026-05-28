# Validation Summary: How to Fix BigQuery Export to Cloud Storage Failing

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google BigQuery
- BigQuery `bq` command-line tool
- BigQuery `EXPORT DATA` SQL statement
- Google Cloud Storage
- CSV, Newline-delimited JSON, Avro, and Parquet exports
- Python Google Cloud Storage client library and pandas

## Sources Consulted
- Google Cloud BigQuery: Export table data to Cloud Storage: https://docs.cloud.google.com/bigquery/docs/exporting-data
- Google Cloud BigQuery: bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud BigQuery: Export statements in GoogleSQL: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/export-statements
- Google Cloud BigQuery: Introduction to data export: https://docs.cloud.google.com/bigquery/docs/export-intro
- Google Cloud BigQuery: Introduction to partitioned tables: https://docs.cloud.google.com/bigquery/docs/partitioned-tables

## Issues Found
- The post described the export limit as a 1 GB individual exported file limit for CSV and JSON, and implied Avro/Parquet have the same physical-file limit. Updated this to match BigQuery documentation: single-file exports are limited to 1 GB of logical table data, regardless of export format.
- The post said compressed exports could exceed a 1 GB exported-file limit. Updated the wording to refer to single-file exports exceeding the documented logical-data limit.
- The wildcard placement section implied broad placement flexibility. Updated it to clarify that BigQuery supports a single wildcard in the filename component of the URI.
- The JSON sharding example used a `.json` destination but omitted `--destination_format=NEWLINE_DELIMITED_JSON`, which means `bq extract` would default to CSV. Added the correct destination format flag.
- The partition examples compared `_PARTITIONDATE` to string literals. BigQuery can coerce compatible literals, but the examples are clearer and more correct with `DATE` literals, so they were updated.
- The post claimed `EXPORT DATA` can set a maximum file size per shard. BigQuery documentation states generated file sizes are not guaranteed and lists no max-file-size option for Cloud Storage exports. Updated the explanation and SQL comment accordingly.

## Review Notes
- The examples assume the reader has the Google Cloud CLI and `bq` command installed and authenticated, and that bucket permissions and BigQuery dataset locations are compatible.
- The downstream pandas example is technically valid for small-to-moderate sharded CSV exports but may be memory-heavy for very large exports.

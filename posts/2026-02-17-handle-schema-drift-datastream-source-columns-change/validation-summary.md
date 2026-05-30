# Validation Summary: How to Handle Schema Drift in Datastream When Source Columns Change

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Datastream
- BigQuery
- Change data capture
- GoogleSQL
- MySQL information_schema
- Cloud Functions for Python
- gcloud CLI

## Sources Consulted
- Google Cloud Datastream BigQuery destination documentation: https://docs.cloud.google.com/datastream/docs/destination-bigquery
- Google Cloud Datastream BigQuery destination configuration documentation: https://docs.cloud.google.com/datastream/docs/configure-bigquery-destination
- Google Cloud Datastream troubleshooting documentation: https://docs.cloud.google.com/datastream/docs/diagnose-issues
- Google Cloud Datastream stream REST reference: https://cloud.google.com/datastream/docs/reference/rest/v1/projects.locations.streams
- Google Cloud SDK gcloud datastream streams update reference: https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/update
- BigQuery GoogleSQL timestamp functions: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/timestamp_functions
- BigQuery GoogleSQL conversion functions: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/conversion_functions
- BigQuery INFORMATION_SCHEMA COLUMNS view documentation: https://cloud.google.com/bigquery/docs/information-schema-columns

## Issues Found
- The BigQuery examples compared `datastream_metadata.source_timestamp` directly to `TIMESTAMP` values. Datastream's BigQuery destination documents this field as an integer, and Datastream event documentation describes source timestamps as epoch milliseconds. Updated the examples to use `TIMESTAMP_MILLIS(datastream_metadata.source_timestamp)`.
- The UNPIVOT example mixed string, integer, and numeric columns into one unpivoted value column. Updated the subquery to cast monitored columns to `STRING` before `UNPIVOT`.
- The Cloud Function imported `monitoring_v3` without using it and filtered out `_metadata_deleted` and `_metadata_change_type`, which are not Datastream BigQuery metadata columns. Removed the unused import and corrected the metadata filter to `datastream_metadata`.
- The dropped-column and transformation examples referenced `_metadata_deleted`, which Datastream does not add to BigQuery destination tables. Removed those references and kept the examples focused on schema cleanup and type handling.
- The stream recovery command used `--state=RUNNING` without `--update-mask=state`. Updated it to match the official gcloud example.
- The troubleshooting command filtered streams with `state=ERROR`, but the Datastream stream state enum uses `FAILED` and `FAILED_PERMANENTLY` for failure states. Updated the example to `state=FAILED`.

## Review Notes
The post is technically relevant and the remaining guidance is consistent with Datastream's documented BigQuery write modes and schema drift behavior. Future improvements could call out merge versus append-only write mode more explicitly, especially when discussing deletes and downstream "current state" views.

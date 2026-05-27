# Validation Summary: How to Set Up BigLake Managed Tables for Automatic Storage Optimization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- Apache Iceberg managed tables
- BigLake / BigQuery Cloud resource connections
- Cloud Storage
- BigQuery Storage Write API
- GoogleSQL DDL and DML
- gcloud CLI and bq CLI

## Sources Consulted
- Google Cloud BigQuery documentation: Apache Iceberg managed tables, https://docs.cloud.google.com/bigquery/docs/biglake-iceberg-tables-in-bigquery
- Google Cloud BigQuery documentation: Create and set up a Cloud resource connection, https://docs.cloud.google.com/bigquery/docs/create-cloud-resource-connection
- Google Cloud BigQuery documentation: Stream data using the Storage Write API, https://docs.cloud.google.com/bigquery/docs/write-api-streaming
- Google Cloud BigQuery documentation: INFORMATION_SCHEMA.JOBS view, https://docs.cloud.google.com/bigquery/docs/information-schema-jobs
- Google Cloud Python client documentation: BigQueryWriteClient, https://docs.cloud.google.com/python/docs/reference/bigquerystorage/latest/google.cloud.bigquery_storage_v1.client.BigQueryWriteClient

## Issues Found
- The post used the outdated `BIGLAKE_MANAGED` table type option. Current BigQuery DDL creates Iceberg managed tables with `file_format = 'PARQUET'`, `table_format = 'ICEBERG'`, `storage_uri`, and `WITH CONNECTION`, so the DDL and summary were updated.
- The table schema used a `JSON` column, but Iceberg managed tables do not support `JSON` in the schema. Changed `properties` to `STRING` and kept `TO_JSON_STRING(...)` in the insert example.
- The setup used a multi-region `gsutil mb -l US` bucket and broad object admin wording. Updated the bucket command to current `gcloud storage buckets create` syntax with a regional bucket, uniform bucket-level access, and public access prevention. Updated IAM examples to grant the documented `roles/storage.objectUser` and `roles/storage.legacyBucketReader` roles to the connection service account.
- The monitoring examples queried `INFORMATION_SCHEMA.TABLE_STORAGE`, which does not include Iceberg managed tables. Replaced those examples with the documented `INFORMATION_SCHEMA.JOBS` query pattern for `CALL BQ.OPTIMIZE_STORAGE(...)` jobs.
- The post claimed specific compaction target file sizes and described orphan cleanup imprecisely. Updated the wording to adaptive file sizing and garbage collection after the time travel window.
- Some examples and comments still used outdated BigLake wording, a mismatched region qualifier, and unused Python imports. Updated those to match the current managed table terminology and examples.

## Review Notes
Partitioning and multi-statement transactions for Iceberg managed tables are still documented as Preview features as of 2026-05-27, but this post does not rely on them.

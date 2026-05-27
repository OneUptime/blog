# Validation Summary: How to Set Up a Medallion Architecture on BigQuery with Bronze Silver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery scheduled queries
- Pub/Sub BigQuery subscriptions
- Google Cloud CLI / bq CLI
- Medallion architecture

## Sources Consulted
- BigQuery dataset creation with `CREATE SCHEMA`: https://cloud.google.com/bigquery/docs/datasets
- BigQuery `LOAD DATA` GoogleSQL reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/load-statements
- BigQuery JSON loading documentation: https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-json
- BigQuery JSON data type documentation: https://cloud.google.com/bigquery/docs/json-data
- BigQuery DML and `MERGE` syntax: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery scheduled queries documentation: https://cloud.google.com/bigquery/docs/scheduling-queries
- Pub/Sub BigQuery subscriptions documentation: https://cloud.google.com/pubsub/docs/create-bigquery-subscription
- `gcloud pubsub subscriptions create` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- BigQuery bq CLI reference for IAM policy binding limitations: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery IAM resource access documentation: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam

## Issues Found
- The `LOAD DATA` example used a bare column list and implied that arbitrary source JSON would be stored directly in `raw_payload`. BigQuery JSON loads map JSON fields to table columns, and `LOAD DATA` column lists are schema definitions. Updated the example to define column types and clarify the required newline-delimited JSON shape.
- The Cloud Storage `LOAD DATA` example included `WITH CONNECTION` for a normal Google Cloud Storage URI. This is unnecessary for the shown load job, so it was removed.
- The Pub/Sub BigQuery subscription command targeted `orders_raw` while using `--write-metadata` and `--use-topic-schema`, but that table did not contain the required Pub/Sub metadata columns or topic-schema-compatible fields. Added a compatible Pub/Sub landing table and updated the command to write metadata to it.
- The `MERGE` statement used `INSERT ROW` even though the source row did not include all target columns, including `_processed_at`. Replaced it with an explicit `INSERT` column list and values.
- The scheduled-query examples used an empty destination table and a destination table/write preference for DDL/DML-style scripts. Updated them to use `--target_dataset` and `--location`, which is the documented pattern for DDL/DML scheduled queries.
- The data quality insert assumed `_data_quality_log` already existed. Added a `CREATE TABLE IF NOT EXISTS` statement before the insert.
- The access-control examples used `bq add-iam-policy-binding` on datasets, but that command does not support datasets. Replaced the examples with BigQuery `GRANT` statements on schemas.

## Review Notes
The local workspace does not have `bq` or `gcloud` installed, so CLI validation was performed against current official Google Cloud documentation rather than local `--help` output.

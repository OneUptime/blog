# Validation Summary: How to Set Up BigQuery Data Transfer Service for Cross-Cloud Data Loads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- BigQuery Data Transfer Service
- Amazon S3 transfers
- Azure Blob Storage transfers
- Terraform Google provider
- BigQuery bq CLI
- Pub/Sub notifications
- Cloud Functions for Python

## Sources Consulted
- Google Cloud BigQuery documentation: Load Amazon S3 data into BigQuery: https://docs.cloud.google.com/bigquery/docs/s3-transfer
- Google Cloud BigQuery documentation: Load Blob Storage data into BigQuery: https://docs.cloud.google.com/bigquery/docs/blob-storage-transfer
- Google Cloud BigQuery documentation: BigQuery bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud BigQuery documentation: Manage transfers: https://docs.cloud.google.com/bigquery/docs/working-with-transfers
- Google Cloud BigQuery documentation: BigQuery Data Transfer Service run notifications: https://docs.cloud.google.com/bigquery/docs/transfer-run-notifications
- Google Cloud BigQuery documentation: Runtime parameters in Blob Storage transfers: https://docs.cloud.google.com/bigquery/docs/blob-storage-transfer-parameters
- Google Cloud BigQuery documentation: Amazon S3 transfer runtime parameterization: https://docs.cloud.google.com/bigquery/docs/s3-transfer-intro
- Google Cloud BigQuery documentation: Using schema auto-detection: https://docs.cloud.google.com/bigquery/docs/schema-detect
- Terraform Registry: google_bigquery_data_transfer_config: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_data_transfer_config

## Issues Found
- The S3, Azure, and schema-evolution transfer examples used `APPEND` for `write_disposition`. BigQuery Data Transfer Service expects `WRITE_APPEND` or `WRITE_TRUNCATE`, so these were corrected to `WRITE_APPEND`.
- Runtime path templates used unsupported date formatting such as `{run_date|yyyyMMdd}` and `{run_date|yyyy/MM/dd}`. BigQuery DTS supports `{run_date}` and `{run_time|"%Y/%m/%d"}` style formatting, so the examples were updated.
- The `bq mk --transfer_config` examples used `--schedule`, but the current `bq mk --transfer_config` reference does not list that flag. The flag was removed from the `bq` examples, and the surrounding text now notes that Terraform, the API, or the console can set the schedule during creation.
- The Azure Blob Storage `data_path` used a full HTTPS URL even though the connector takes `storage_account`, `container`, and a relative `data_path` separately. The example now uses a relative path.
- The Terraform example specified `secret_access_key` in both `params` and `sensitive_params`, which the provider documentation says is invalid. The duplicate `params` entry was removed.
- The write-disposition section listed `MIRROR`, which is not a valid write disposition for the S3 or Azure Blob transfer examples. That line was removed.
- The Pub/Sub notification example used an unsupported `bq update --notification_pubsub_topic` command. It was replaced with the official Python client pattern using `notification_pubsub_topic` and an update mask.
- The backfill command used `--run_time` together with `--start_time` and `--end_time`, but the bq CLI supports either a single run time or a time range. The extra `--run_time` flag was removed.
- The schema evolution section claimed Parquet and Avro transfers automatically add new columns to the destination table. The wording was corrected to say that these formats carry schema information, but recurring transfers should have the destination table schema updated before loading files with new columns.

## Review Notes
- The post is technically relevant and contains implementation details, so it was reviewed as a code/tutorial post.
- The local environment did not have the `bq` CLI installed, so CLI validation was performed against the official Google Cloud bq command-line reference.

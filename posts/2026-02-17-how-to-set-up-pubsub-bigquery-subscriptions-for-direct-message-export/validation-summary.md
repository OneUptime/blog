# Validation Summary: How to Set Up Pub/Sub BigQuery Subscriptions for Direct Message Export

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub BigQuery subscriptions
- BigQuery
- Google Cloud CLI
- Terraform Google provider
- Cloud Monitoring

## Sources Consulted
- Google Cloud Pub/Sub: Create BigQuery subscriptions: https://docs.cloud.google.com/pubsub/docs/create-bigquery-subscription
- Google Cloud Pub/Sub: BigQuery subscriptions overview and schema compatibility: https://docs.cloud.google.com/pubsub/docs/bigquery
- Google Cloud SDK reference: `gcloud pubsub subscriptions create`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud Pub/Sub: Dead-letter topics: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub: Troubleshoot BigQuery subscriptions: https://docs.cloud.google.com/pubsub/docs/bigquery-troubleshooting
- Google Cloud Pub/Sub: Monitor Pub/Sub in Cloud Monitoring: https://docs.cloud.google.com/pubsub/docs/monitoring
- Google Cloud Monitoring metrics list: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Terraform Google provider: `google_pubsub_subscription`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription

## Issues Found
- The post said Pub/Sub can write BigQuery subscriptions in two modes. Updated it to include the current table-schema mode for JSON messages.
- The raw `data` column comment said the message body is base64 decoded. Updated it to describe the column as the message body, matching Pub/Sub documentation.
- The `gcloud pubsub subscriptions create` command used a colon-form BigQuery table identifier. Updated it to the documented `PROJECT.DATASET.TABLE` form.
- The no-topic-schema path only described raw `data` column writes. Added the `--use-table-schema` option for JSON field-to-column mapping.
- The post said unmatched message fields are silently dropped. Updated this to explain that schema fields not present in BigQuery fail writes unless `drop_unknown_fields` is enabled.
- The dead-letter section implied permission errors are caught by DLQ handling. Updated it to distinguish message-level write failures from configuration errors that leave the subscription in an error state.
- The Terraform dead-letter example omitted required Pub/Sub IAM grants for forwarding and acknowledging dead-lettered messages. Added `roles/pubsub.publisher` on the dead-letter topic and `roles/pubsub.subscriber` on the source subscription for the Pub/Sub service agent.
- The monitoring command claimed to check backlog but only returned message retention duration. Updated it to show subscription state and export configuration instead.
- The limitations section said there is no support for partitioning on custom timestamp fields. Replaced this with the documented streaming-buffer behavior for partitioned tables.
- The limitations section said there is no transformation support. Updated it to reflect current support for lightweight subscription transforms while preserving the recommendation to use Dataflow for complex transformation.

## Review Notes
The post is technically relevant and current after the fixes. BigQuery subscriptions provide at-least-once delivery, so workloads that require exact deduplication should account for possible duplicates downstream.

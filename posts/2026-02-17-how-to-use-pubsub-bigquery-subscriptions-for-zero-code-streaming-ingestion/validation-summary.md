# Validation Summary: How to Use Pub/Sub BigQuery Subscriptions for Zero-Code Streaming Ingestion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub BigQuery subscriptions
- BigQuery
- BigQuery Storage Write API
- Google Cloud CLI
- BigQuery CLI
- Cloud Monitoring

## Sources Consulted
- Google Cloud Pub/Sub: Create BigQuery subscriptions - https://docs.cloud.google.com/pubsub/docs/create-bigquery-subscription
- Google Cloud Pub/Sub: BigQuery subscriptions - https://docs.cloud.google.com/pubsub/docs/bigquery
- Google Cloud Pub/Sub: Subscription properties - https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud SDK: gcloud pubsub subscriptions create - https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud Pub/Sub: Associate a schema with a topic - https://docs.cloud.google.com/pubsub/docs/associate-schema-topic
- Google Cloud Pub/Sub: Quotas and limits - https://docs.cloud.google.com/pubsub/quotas
- Google Cloud Pub/Sub: Pricing - https://cloud.google.com/pubsub/pricing
- BigQuery: Quotas and limits - https://docs.cloud.google.com/bigquery/quotas
- Google Cloud Pub/Sub: Monitor Pub/Sub in Cloud Monitoring - https://docs.cloud.google.com/pubsub/docs/monitoring

## Issues Found
- The initial table schema included a `payload` column while the test message used a nested `data` object. I changed the simple table schema and test message so the walkthrough's default path uses matching flat JSON fields.
- The first BigQuery subscription command used `--use-topic-schema` before the tutorial created or attached a Pub/Sub topic schema. I changed the main path to `--use-table-schema`, which matches the table-first JSON workflow described in the post.
- The first subscription command used `--write-metadata` without creating the required metadata columns (`subscription_name`, `message_id`, `publish_time`, `data`, and `attributes`) in the BigQuery table. I removed the flag from the main command and flag explanation.
- The IAM section granted `roles/bigquery.metadataViewer`, but the official BigQuery subscription setup requires the Pub/Sub service agent to have BigQuery Data Editor permission to write to the table. I removed the unnecessary metadata grant.
- The Pub/Sub `--bigquery-table` examples used `project:dataset.table` notation. I updated them to the documented `project.dataset.table` form for `gcloud pubsub subscriptions create`.
- The dead-letter inspection command pulled from `events-dead-letter-sub` without creating that subscription. I added the missing `gcloud pubsub subscriptions create` command for the dead-letter topic.
- The Avro topic schema example used `timestamp-micros`, which requires numeric microsecond values when publishing JSON-encoded schema messages. I changed the field to `string`, which is compatible with a BigQuery `TIMESTAMP` column when values use a valid timestamp format.
- The performance and cost section referred to generic streaming insert limits and BigQuery streaming insert charges. I updated it to Storage Write API throughput limits and Pub/Sub BigQuery subscription pricing, including the current distinction between `US`/`EU` multi-region throughput and regional throughput.

## Review Notes
The post is technically relevant and current. The examples are now consistent for the default table-schema workflow. In a future revision, the author could add a separate metadata-enabled table schema example if they want to demonstrate `--write-metadata`.

# Validation Summary: How to Migrate Amazon Kinesis Data Streams to Google Cloud Pub/Sub and Dataflow

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon Kinesis Data Streams
- Amazon Managed Service for Apache Flink / KinesisAnalyticsV2 API
- Google Cloud Pub/Sub
- Google Cloud Dataflow
- Apache Beam
- Python
- AWS CLI
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- AWS Kinesis Data Streams retention documentation: https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html
- AWS Kinesis Data Streams quotas and shard throughput documentation: https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
- AWS announcement for Amazon Managed Service for Apache Flink rename: https://aws.amazon.com/about-aws/whats-new/2023/08/amazon-managed-service-apache-flink/
- AWS Kinesis Data Analytics for SQL discontinuation notice: https://docs.aws.amazon.com/kinesisanalytics/latest/dev/what-is.html
- AWS CLI kinesisanalyticsv2 command reference: https://docs.aws.amazon.com/cli/latest/reference/kinesisanalyticsv2/
- Google Cloud Pub/Sub ordering documentation: https://docs.cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub quotas and limits: https://docs.cloud.google.com/pubsub/quotas
- Google Cloud Pub/Sub subscription creation and retention documentation: https://cloud.google.com/pubsub/docs/create-subscription
- Google Cloud Dataflow Pub/Sub streaming documentation: https://docs.cloud.google.com/dataflow/docs/concepts/streaming-with-cloud-pubsub
- Google Cloud Dataflow documentation: https://cloud.google.com/dataflow/docs
- gcloud Pub/Sub subscriptions create reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Pub/Sub Python BatchSettings reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.BatchSettings

## Issues Found
- The post referred to Kinesis Data Analytics as a current SQL-or-Flink service. AWS renamed Kinesis Data Analytics for Apache Flink to Amazon Managed Service for Apache Flink, and legacy Kinesis Data Analytics for SQL applications were discontinued on January 27, 2026. Updated the terminology and added the discontinuation caveat.
- The Pub/Sub Python producer used an `ordering_key` without enabling message ordering on the publisher client. Updated the example to create `PublisherOptions(enable_message_ordering=True)` and pass it to `PublisherClient`.
- The Cloud Monitoring alert command used `--condition-threshold-value` and `--condition-threshold-comparison`, which are not flags for `gcloud monitoring policies create`. Replaced them with the documented `--duration=60s` and `--if="> 300"` syntax.
- The Dataflow migration text described converting a Kinesis Analytics SQL query. Updated the wording to describe Flink SQL-style aggregation logic and the current Amazon Managed Service for Apache Flink service.

## Review Notes
The remaining examples are illustrative and require project-specific setup, IAM permissions, installed AWS and Google Cloud CLIs, and configured client credentials. Pub/Sub ordering is per ordering key and depends on enabling ordering on the subscription; Dataflow documentation also notes that Pub/Sub message ordering is not recommended for Dataflow pipelines because downstream Beam transforms might not preserve order.

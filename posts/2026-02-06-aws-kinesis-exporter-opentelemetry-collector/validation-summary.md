# Validation Summary: How to Configure the AWS Kinesis Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- AWS Kinesis exporter (`awskinesisexporter`)
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- AWS Lambda event source mappings
- Amazon Managed Service for Apache Flink
- AWS IAM
- AWS CLI
- Python Lambda consumers

## Sources Consulted
- OpenTelemetry Collector Contrib `awskinesisexporter` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/awskinesisexporter/README.md
- OpenTelemetry Collector Contrib `awskinesisexporter` config schema and implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/awskinesisexporter
- OpenTelemetry Collector Contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- AWS CLI `kinesis create-stream` documentation: https://docs.aws.amazon.com/cli/latest/reference/kinesis/create-stream.html
- AWS CLI `lambda create-event-source-mapping` documentation: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- AWS Kinesis Data Analytics for SQL discontinuation documentation: https://docs.aws.amazon.com/kinesisanalytics/latest/dev/discontinuation.html
- Amazon Data Firehose rename announcement: https://aws.amazon.com/about-aws/whats-new/2024/02/amazon-data-firehose-formerly-kinesis-data-firehose/

## Issues Found
- The `awskinesis` exporter examples used invalid top-level fields (`region`, `stream_name`, `encoding`, `compression`, and `partition_key`). Updated examples to use the current schema: `aws.region`, `aws.stream_name`, `encoding.name`, and `encoding.compression`, and removed unsupported `partition_key`.
- The partition-key section claimed configurable strategies such as `service.name`, `trace_id`, and `random`. The current exporter does not expose a partition key setting for users. Replaced that guidance with batching and record-size configuration and noted that OTLP encodings use internally generated randomized partition keys.
- The production configuration declared `extensions` twice, which makes the YAML unsafe because one mapping can overwrite the other. Merged `health_check` and `file_storage` into a single `extensions` block.
- The production telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Removed the deprecated/ignored field while keeping the current `metrics.level` setting.
- The routing examples used the removed/deprecated `routing` processor syntax. Updated them to the current `routing` connector syntax with routed pipelines.
- The article referenced Kinesis Data Analytics SQL and included SQL application examples. AWS discontinued Kinesis Data Analytics for SQL applications and deleted applications starting January 27, 2026. Replaced this with current Amazon Managed Service for Apache Flink guidance.
- Updated outdated AWS service naming from Kinesis Data Firehose to Amazon Data Firehose and Elasticsearch to Amazon OpenSearch Service where applicable.

## Review Notes
The edited YAML snippets were parsed successfully, and a targeted check confirmed that remaining `awskinesis` exporter examples no longer include unsupported exporter keys. A full Collector binary validation was not run because no `otelcol-contrib` executable is installed in the workspace.

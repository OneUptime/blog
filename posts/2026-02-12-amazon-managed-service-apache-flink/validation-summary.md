# Validation Summary: How to Set Up Amazon Managed Service for Apache Flink

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Managed Service for Apache Flink
- AWS CLI `kinesisanalyticsv2`
- Apache Flink DataStream API
- Apache Flink Kinesis connector
- Amazon Kinesis Data Streams
- AWS IAM
- Amazon S3
- Amazon CloudWatch metrics

## Sources Consulted
- AWS CLI Command Reference: `create-application`: https://docs.aws.amazon.com/cli/latest/reference/kinesisanalyticsv2/create-application.html
- AWS CLI Command Reference: `start-application`: https://docs.aws.amazon.com/cli/latest/reference/kinesisanalyticsv2/start-application.html
- AWS CLI Command Reference: `update-application`: https://docs.aws.amazon.com/cli/latest/reference/kinesisanalyticsv2/update-application.html
- Amazon Managed Service for Apache Flink Developer Guide, autoscaling: https://docs.aws.amazon.com/managed-flink/latest/java/how-scaling.html
- Amazon Managed Service for Apache Flink Developer Guide, CloudWatch metrics: https://docs.aws.amazon.com/managed-flink/latest/java/metrics-dimensions.html
- Amazon Managed Service for Apache Flink Developer Guide, permissions: https://docs.aws.amazon.com/managed-flink/latest/java/security_iam_service-with-iam.html
- Amazon Managed Service for Apache Flink pricing and KPU definition: https://aws.amazon.com/managed-service-apache-flink/pricing/
- Apache Flink 1.18 Kinesis connector documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/datastream/kinesis/

## Issues Found
- The Java example used the older `FlinkKinesisProducer` sink API and omitted imports required for `SimpleStringSchema` and `TumblingProcessingTimeWindows`. Updated the example to use `KinesisStreamsSink`, added the required imports, and switched the sink call from `addSink` to `sinkTo`.
- The Kinesis consumer configuration used raw string keys. Replaced them with the official Flink connector constants for the AWS region, initial stream position, Enhanced Fan-Out record publisher type, and EFO consumer name.
- The IAM policy omitted Kinesis actions commonly needed by Enhanced Fan-Out consumers. Added `kinesis:DescribeStreamSummary` and `kinesis:DeregisterStreamConsumer`.
- The starting section said the `start-application` command tells the application where to begin reading. Corrected this because the Flink source configuration controls the Kinesis starting position, while the run configuration controls state restoration behavior.
- The autoscaling section claimed auto scaling can grow to 8x the initial parallelism. Updated this to describe scaling up to the maximum parallelism allowed by the application's KPU quota.
- The KPU storage description referred specifically to application state. Updated it to the AWS pricing wording of 50 GB running application storage per KPU.
- The monitoring section listed `records_lag_max`, which is an MSK/Kafka-style lag metric rather than the Kinesis consumer lag metric used in this context. Replaced it with `millisbehindLatest`.

## Review Notes
The Java snippet still assumes application-specific types and helpers such as `OrderSummary`, `parseOrder`, and `OrderAggregator` exist elsewhere in the project. That is acceptable for a tutorial snippet, but a future version could include a complete minimal Maven project for copy-paste execution. The post targets `FLINK-1_18`; AWS currently lists newer runtimes, and the `uptime` and `downtime` metrics are deprecated for Flink 2.2, but they remain relevant to the runtime shown in the example.

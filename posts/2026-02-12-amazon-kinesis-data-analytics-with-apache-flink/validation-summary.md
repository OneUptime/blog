# Validation Summary: How to Use Amazon Kinesis Data Analytics with Apache Flink

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Amazon Managed Service for Apache Flink, formerly Kinesis Data Analytics for Apache Flink
- Amazon Kinesis Data Streams
- Apache Flink 1.18.1
- Java DataStream API
- PyFlink Table API and SQL
- Maven
- AWS CLI `kinesisanalyticsv2`
- CloudWatch metrics

## Sources Consulted
- AWS Managed Service for Apache Flink 1.18 documentation: https://docs.aws.amazon.com/managed-flink/latest/java/flink-1-18.html
- AWS Managed Service for Apache Flink supported versions: https://docs.aws.amazon.com/managed-flink/latest/java/release-version-list.html
- AWS Managed Service for Apache Flink streaming sources documentation: https://docs.aws.amazon.com/managed-flink/latest/java/how-sources.html
- AWS Managed Service for Apache Flink fault tolerance documentation: https://docs.aws.amazon.com/managed-flink/latest/java/how-fault.html
- AWS Managed Service for Apache Flink checkpoints troubleshooting: https://docs.aws.amazon.com/managed-flink/latest/java/troubleshooting-checkpoints.html
- AWS CLI `kinesisanalyticsv2 create-application` command reference: https://docs.aws.amazon.com/cli/latest/reference/kinesisanalyticsv2/create-application.html
- AWS CLI `kinesisanalyticsv2 start-application` command reference: https://docs.aws.amazon.com/cli/latest/reference/kinesisanalyticsv2/start-application.html
- AWS CLI `kinesisanalyticsv2 update-application` command reference: https://docs.aws.amazon.com/cli/latest/reference/kinesisanalyticsv2/update-application.html
- AWS CLI `kinesisanalyticsv2 create-application-snapshot` command reference: https://docs.aws.amazon.com/cli/latest/reference/kinesisanalyticsv2/create-application-snapshot.html
- Apache Flink 1.18 Kinesis DataStream connector documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/datastream/kinesis/
- Apache Flink 1.18 Kinesis Table connector documentation: https://nightlies.apache.org/flink/flink-docs-release-1.18/docs/connectors/table/kinesis/
- Apache Flink Windowing TVF documentation: https://nightlies.apache.org/flink/flink-docs-release-1.20/docs/dev/table/sql/queries/window-tvf/
- PyFlink TableEnvironment documentation: https://nightlies.apache.org/flink/flink-docs-stable/api/python/reference/pyflink.table/table_environment.html
- Kinesis Data Analytics for SQL discontinuation documentation: https://docs.aws.amazon.com/kinesisanalytics/latest/dev/discontinuation.html

## Issues Found
- The post used the old service name throughout and implied legacy Kinesis Data Analytics SQL was still the direct comparison point. Updated the main wording to Amazon Managed Service for Apache Flink and clarified that SQL is supported through Flink, while preserving the title and link text.
- The Maven snippet used `aws-kinesisanalytics-runtime` version `2.0.0`, but the Managed Service for Apache Flink 1.18 component version is `1.2.0`. Updated the runtime version.
- The Maven snippet used the Flink runtime version for Kinesis connector artifacts. Updated it to use the versioned Kinesis connector line `4.3.0-1.18` and added the `flink-connector-aws-kinesis-streams` dependency required by the Kinesis Streams sink.
- The Java source configuration used `Properties` and the old `flink.stream.initpos` key with `KinesisStreamsSource`. Updated it to the documented Flink `Configuration` plus `KinesisSourceConfigOptions.STREAM_INITIAL_POSITION`.
- The Java sink used `setStreamArn`, but the Flink 1.18 `KinesisStreamsSink` documentation shows `setStreamName`. Updated the sink configuration and separated source and sink configuration objects.
- The Java example configured event-time watermarks but used a processing-time tumbling window. Changed it to `TumblingEventTimeWindows` so the watermark strategy is actually used.
- The Java examples referenced `EngagementAccumulator` and `EngagementResult` without defining them. Added minimal DTO classes to make the example complete.
- Placeholder AWS account IDs had 9 digits. Updated them to 12-digit placeholders.
- The PyFlink SQL used legacy grouped window functions. Updated it to a window table-valued function query using `TABLE(TUMBLE(...))` and `window_start` / `window_end`.
- The state section called `create-application-snapshot` a savepoint. Updated the section to use the Managed Service for Apache Flink application snapshot terminology.

## Review Notes
Flink 1.18.1 is still listed as supported by Amazon Managed Service for Apache Flink, but it is no longer supported by the Apache Flink community. For new projects, consider updating the post in the future to use the latest Managed Service for Apache Flink runtime and matching connector versions.

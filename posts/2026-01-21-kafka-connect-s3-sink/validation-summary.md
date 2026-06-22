# Validation Summary: How to Sink Kafka Data to S3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Connect
- Confluent Amazon S3 Sink Connector
- Amazon S3
- AWS CLI
- AWS Athena
- AWS Glue Crawler
- Terraform AWS provider
- Docker Compose
- LocalStack

## Sources Consulted
- Confluent Amazon S3 Sink Connector for Confluent Platform overview: https://docs.confluent.io/kafka-connectors/s3-sink/current/overview.html
- Confluent Amazon S3 Sink Connector configuration reference: https://docs.confluent.io/kafka-connectors/s3-sink/current/configuration_options.html
- Confluent Platform Kafka Connect REST API and monitoring documentation: https://docs.confluent.io/platform/current/connect/monitoring.html
- AWS CLI `s3 ls` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- Amazon Athena `CREATE TABLE` documentation: https://docs.aws.amazon.com/athena/latest/ug/create-table.html
- Amazon Athena `MSCK REPAIR TABLE` documentation: https://docs.aws.amazon.com/athena/latest/ug/msck-repair-table.html
- Terraform AWS provider `aws_glue_crawler` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_crawler
- Apache Kafka Docker documentation: https://kafka.apache.org/41/getting-started/docker/
- Confluent Docker image reference: https://docs.confluent.io/platform/current/installation/docker/image-reference.html

## Issues Found
- The production Parquet example included `s3.compression.type` and `s3.compression.level`. These settings apply to `JsonFormat` and `ByteArrayFormat`, not Parquet, so they were removed from the Parquet production configuration.
- The DailyPartitioner output path was shown as `topics/orders/2024/01/15/...`. Confluent documents DailyPartitioner paths as `year=YYYY/month=MM/day=dd`, so the example path was corrected.
- The "Custom Partitioner" example used `TimeBasedPartitioner` with a custom path format, not a custom partitioner class. The heading was corrected to "Custom Time-Based Partitioning."
- The scheduled rotation example omitted `timezone`, which Confluent requires when `rotate.schedule.interval.ms` is set. `timezone` was added to the scheduled and combined rotation snippets.
- The `rotate.interval.ms` explanation said it rotates every ten minutes regardless of size. Confluent documents it as record-timestamp-span based, with idle-file caveats, so the wording was corrected.
- The exactly-once example used `store.url` as a boolean and implied deduplication was required for exactly-once semantics. `store.url` is a storage endpoint URL, and the S3 Sink connector can provide exactly-once semantics with deterministic partitioning. The example and note were corrected.
- The server-side encryption example used `s3.sse.customer.algorithm`, which is not the documented connector property. It was corrected to `s3.ssea.name`.
- The monitoring snippet listed unverified S3-specific metric names and placed `offset-commit-success-percentage` under the sink-task MBean. It was updated to the documented Kafka Connect connector, connector-task, and sink-task MBeans and metrics.
- The best-practices section described both Parquet and Avro as columnar formats. Parquet is columnar; Avro is row-oriented and useful for schema evolution. The wording was corrected.

## Review Notes
The Docker Compose setup is suitable as a local illustrative setup, but production deployments should normally build a Kafka Connect image with connector plugins preinstalled rather than installing from Confluent Hub at container startup. The production example includes both `rotate.interval.ms` and `rotate.schedule.interval.ms`; that is a valid combined rotation strategy, but scheduled rotation should not be used when exactly-once guarantees are required.

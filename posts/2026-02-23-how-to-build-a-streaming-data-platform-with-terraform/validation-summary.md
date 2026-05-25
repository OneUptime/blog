# Validation Summary: How to Build a Streaming Data Platform with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon MSK / Apache Kafka
- AWS Glue Schema Registry
- Amazon Managed Service for Apache Flink
- Amazon Data Firehose / Kinesis Firehose
- Amazon S3
- Amazon CloudWatch metrics and alarms

## Sources Consulted
- Terraform AWS Provider `aws_msk_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/msk_cluster
- Terraform AWS Provider `aws_glue_schema` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_schema
- Terraform AWS Provider `aws_kinesisanalyticsv2_application` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesisanalyticsv2_application
- Terraform AWS Provider `aws_kinesis_firehose_delivery_stream` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_firehose_delivery_stream
- AWS Glue Schema Registry documentation: https://docs.aws.amazon.com/glue/latest/dg/schema-registry.html
- Amazon Managed Service for Apache Flink 1.18 documentation: https://docs.aws.amazon.com/managed-flink/latest/java/flink-1-18.html
- Amazon Data Firehose record format conversion documentation: https://docs.aws.amazon.com/firehose/latest/dev/record-format-conversion.html
- Amazon Data Firehose format conversion API restrictions: https://docs.aws.amazon.com/firehose/latest/dev/enable-record-format-conversion.html
- Amazon MSK consumer lag documentation: https://docs.aws.amazon.com/msk/latest/developerguide/consumer-lag.html
- Amazon MSK CloudWatch metrics documentation: https://docs.aws.amazon.com/msk/latest/developerguide/metrics-details.html
- Amazon MSK supported Kafka versions documentation: https://docs.aws.amazon.com/msk/latest/developerguide/supported-kafka-versions.html

## Issues Found
- The MSK cluster example enabled `provisioned_throughput` on `kafka.m5.large`. The Terraform AWS Provider documentation states provisioned storage throughput requires `kafka.m5.4xlarge` or larger, so the unsupported throughput block was removed.
- The MSK broker log S3 configuration used `s3_logs`, but the current Terraform AWS Provider schema uses an `s3` block under `logging_info.broker_logs`. Updated the block name to `s3`.
- The `MaxOffsetLag` CloudWatch alarm omitted the `Topic` dimension. Amazon MSK documents `MaxOffsetLag` with `Cluster Name`, `Consumer Group`, and `Topic`, so `Topic = "orders"` was added.
- The `KafkaDataLogsDiskUsed` CloudWatch alarm omitted the required `Broker ID` dimension. Amazon MSK documents this metric with `Cluster Name` and `Broker ID`, so the alarm was changed to create one alarm per broker for the three-broker example.

## Review Notes
- Apache Kafka 3.5.1 is still listed as supported by Amazon MSK, though AWS currently marks 3.9.x as recommended. A future refresh could update the examples to a newer recommended Kafka version.
- Amazon Kinesis Data Firehose has been renamed Amazon Data Firehose in AWS documentation, but the Terraform resource name remains `aws_kinesis_firehose_delivery_stream`.

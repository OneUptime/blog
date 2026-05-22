# Validation Summary: How to Handle Terraform for Real-Time Data Pipeline Infrastructure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- AWS Kinesis Data Streams
- AWS Lambda event source mappings
- Amazon MSK
- Amazon Data Firehose
- Amazon S3
- AWS Glue Data Catalog
- Amazon CloudWatch
- Amazon SQS
- Amazon SNS

## Sources Consulted
- Terraform AWS Provider documentation for `aws_kinesis_stream`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_stream
- AWS Kinesis Data Streams `create-stream` documentation: https://docs.aws.amazon.com/cli/latest/reference/kinesis/create-stream.html
- Terraform AWS Provider documentation for `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda documentation for Kinesis event source on-failure destinations: https://docs.aws.amazon.com/lambda/latest/dg/kinesis-on-failure-destination.html
- Terraform AWS Provider documentation for `aws_lambda_event_source_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS Provider documentation for `aws_msk_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/msk_cluster
- AWS MSK broker type and broker size documentation: https://docs.aws.amazon.com/msk/latest/developerguide/broker-instance-types.html and https://docs.aws.amazon.com/msk/latest/developerguide/broker-instance-sizes.html
- AWS MSK supported Kafka versions documentation: https://docs.aws.amazon.com/msk/latest/developerguide/supported-kafka-versions.html
- Terraform AWS Provider documentation for `aws_kinesis_firehose_delivery_stream`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_firehose_delivery_stream
- AWS Kinesis Data Streams CloudWatch metrics documentation: https://docs.aws.amazon.com/streams/latest/dev/monitoring-with-cloudwatch.html
- AWS SQS CloudWatch metrics documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html

## Issues Found
- The Kinesis stream example configured production with `stream_mode = "ON_DEMAND"` while also setting `shard_count = 10`. AWS documents that on-demand streams automatically manage shards, while provisioned streams require shard counts. Updated the example to set `shard_count` only for the provisioned non-production case by using `null` for production.
- The Lambda function example included `dead_letter_config` on the function even though the pipeline uses a Kinesis event source mapping. Lambda function DLQs apply to asynchronous invocations; Kinesis stream failures should be retained with the event source mapping `destination_config`, which the post already shows. Removed the function-level DLQ block to avoid implying it handles Kinesis batch failures.
- The MSK example enabled provisioned EBS throughput on `kafka.m5.2xlarge`, but the Terraform AWS Provider documentation states that provisioned storage throughput requires `kafka.m5.4xlarge` or larger. Updated the production broker type to `kafka.m5.4xlarge`.
- The MSK example set `volume_throughput = 0` when provisioned throughput was disabled, but the documented minimum throughput value is 250 MiB/s. Replaced the block with a Terraform `dynamic` block so it is only emitted for production, where throughput is enabled with a valid value.

## Review Notes
The snippets are illustrative and still assume supporting resources exist, including IAM roles and policies, KMS keys, S3 buckets, SQS queues, SNS topics, Lambda deployment packages, Glue catalog resources, and CloudWatch log groups. Kafka version `3.5.1` is still listed as supported by Amazon MSK, though newer versions are available.

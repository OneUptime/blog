# Validation Summary: How to Configure DynamoDB Kinesis Data Streaming with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS DynamoDB
- Amazon Kinesis Data Streams
- AWS Lambda
- AWS IAM
- AWS KMS
- AWS CLI
- HashiCorp AWS Provider

## Sources Consulted
- AWS DynamoDB Developer Guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/kds.html
- AWS DynamoDB getting started with Kinesis Data Streams: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/kds_gettingstarted.html
- AWS DynamoDB API Reference, `DescribeKinesisStreamingDestination`: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DescribeKinesisStreamingDestination.html
- Amazon Kinesis Data Streams retention period docs: https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html
- Amazon Kinesis Data Streams stream and shard behavior: https://docs.aws.amazon.com/streams/latest/dev/working-with-streams.html
- Amazon Kinesis Data Streams enhanced fan-out docs: https://docs.aws.amazon.com/streams/latest/dev/building-consumers.html
- AWS Lambda Kinesis event source mapping docs: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-create.html
- AWS Lambda Kinesis event source parameters: https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html
- AWS managed policy reference for `AWSLambdaKinesisExecutionRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaKinesisExecutionRole.html
- Amazon Managed Service for Apache Flink overview: https://docs.aws.amazon.com/managed-flink/latest/java/what-is.html
- Amazon Kinesis Data Analytics for SQL Applications discontinuation notice: https://docs.aws.amazon.com/kinesisanalytics/latest/dev/discontinuation.html
- HashiCorp AWS Provider docs source for `aws_kinesis_stream`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kinesis_stream.html.markdown
- HashiCorp AWS Provider docs source for `aws_dynamodb_table`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- HashiCorp AWS Provider docs source for `aws_dynamodb_kinesis_streaming_destination`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_kinesis_streaming_destination.html.markdown
- HashiCorp AWS Provider docs source for `aws_lambda_event_source_mapping`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_event_source_mapping.html.markdown
- HashiCorp AWS Provider docs source for `aws_iam_role_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy.html.markdown

## Issues Found
- The Kinesis stream example said `stream_mode_details` enabled enhanced fan-out. That was incorrect. Enhanced fan-out is a separate Kinesis consumer capability, so the comment was changed to describe capacity mode instead.
- The Lambda consumer IAM policy was missing `kinesis:DescribeStreamSummary` and `kinesis:SubscribeToShard`, which AWS documents as required for Lambda to read from Kinesis. The policy was updated accordingly.
- The same IAM policy included `kinesis:ListStreams`, but the example config creates the event source mapping by direct stream ARN and does not require that permission. It was removed from the example policy.
- The `parallelization_factor` comment described "concurrent shards per shard," which is inaccurate. AWS documents this as concurrent batches per shard, so the comment was corrected.
- The conclusion referenced Amazon Kinesis Data Analytics for real-time SQL queries. That service reference is outdated for a March 20, 2026 post because Kinesis Data Analytics for SQL applications was discontinued starting January 27, 2026. It was replaced with Amazon Managed Service for Apache Flink.
- The introduction’s generic "Kinesis analytics services" wording was updated to point to a current supported service, Amazon Managed Service for Apache Flink, to avoid reinforcing the discontinued service reference.

## Review Notes
- The OpenTofu/HCL syntax used in the post is still valid with current AWS provider documentation.
- The examples assume `var.kms_key_arn` refers to a customer-managed KMS key whose key policy already permits the required Kinesis Data Streams and Lambda access. If the key policy does not allow those principals, deployment will fail even if the IAM snippets are present.

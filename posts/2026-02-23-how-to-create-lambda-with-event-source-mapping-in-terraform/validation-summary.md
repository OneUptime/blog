# Validation Summary: How to Create Lambda with Event Source Mapping in Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (HCL)
- AWS Lambda (event source mappings)
- AWS SQS (with DLQ, redrive policy, SSE)
- AWS Kinesis Data Streams (ON_DEMAND mode)
- AWS DynamoDB Streams
- Amazon MSK (Managed Streaming for Apache Kafka) with IAM auth
- AWS IAM (roles, policies, IAM-based Kafka access)
- AWS CloudWatch metric alarms
- AWS SNS (alerting)
- Node.js 20.x Lambda runtime

## Sources Consulted
- Terraform AWS provider docs: `aws_lambda_event_source_mapping` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping)
- Terraform AWS provider docs: `aws_kinesis_stream` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kinesis_stream)
- Terraform AWS provider docs: `aws_dynamodb_table` (stream attributes)
- AWS Lambda Developer Guide — Event source mappings, filter patterns for SQS, partial batch failures
- AWS MSK service authorization reference (kafka: actions)
- AWS Kafka cluster IAM actions reference (kafka-cluster: actions)

## Issues Found
No technical issues found.

Verified that all `aws_lambda_event_source_mapping` arguments used in the post are valid and current:
- `scaling_config.maximum_concurrency` (value 10 within 2-1000 range)
- `parallelization_factor` (value 2 within 1-10 range)
- `maximum_retry_attempts` (values 3 and 5 within -1 to 10000 range)
- `maximum_record_age_in_seconds` (86400 and 3600 within 60-604800 range)
- `tumbling_window_in_seconds` (value 60 within 0-900 range)
- `function_response_types = ["ReportBatchItemFailures"]` — only valid value
- `starting_position = "LATEST"` valid for Kinesis, DynamoDB Streams, and MSK
- `destination_config { on_failure { destination_arn } }` block structure correct
- `amazon_managed_kafka_event_source_config { consumer_group_id }` block correct
- `filter_criteria { filter { pattern } }` block correct; SQS filter on `body` field is the documented approach for JSON-parsed message bodies

Verified Kinesis stream configuration:
- `stream_mode_details { stream_mode = "ON_DEMAND" }` correctly omits `shard_count` (required only for PROVISIONED)
- `retention_period = 168` correct (units are hours; 7 days)
- `encryption_type = "KMS"` is a valid value

Verified DynamoDB table: `stream_view_type = "NEW_AND_OLD_IMAGES"` is one of the four valid values.

Verified all MSK IAM actions (kafka:* and kafka-cluster:*) are valid per AWS service authorization references.

Verified SQS queue visibility timeout of 360s with Lambda timeout of 60s satisfies the 6x recommendation.

## Review Notes
- The `kinesis:SubscribeToShard` and `kinesis:ListStreams` actions are not strictly required for a standard (non-enhanced-fan-out) Lambda event source mapping reading from a specific stream, but their inclusion is harmless and does not invalidate the example.
- The Node.js 20.x runtime is currently supported by AWS Lambda; newer LTS runtimes (e.g., nodejs22.x) are also available — readers may prefer the latest as deployment time advances.
- The SQS event filter `body = { type = [...] }` works only when the message body is valid JSON. Plain-text bodies would not match this pattern; this is an AWS Lambda filtering constraint rather than an error in the post.
- The post correctly notes that `function_response_types = ["ReportBatchItemFailures"]` requires the Lambda function to return a `batchItemFailures` array.

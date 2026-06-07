# Validation Summary: How to Use SQS for Event-Driven Architecture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Standard and FIFO queues)
- Amazon SNS (for fan-out pattern)
- AWS Lambda (SQS event source integration)
- Amazon CloudWatch (alarms and metrics)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`, `@aws-sdk/client-sns`, `@aws-sdk/client-cloudwatch`)
- AWS SDK for Python (boto3)
- Node.js
- Python
- Terraform (HCL) with AWS provider
- IAM (roles and policies)

## Sources Consulted
- Amazon SQS Developer Guide: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/
- SQS CreateQueue API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html
- SQS ReceiveMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- AWS SDK for JavaScript v3 docs for `@aws-sdk/client-sqs`
- boto3 SQS client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs.html
- AWS Lambda SQS event source mapping docs: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda partial batch responses for SQS: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda runtime support policy: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS provider `aws_sqs_queue` and `aws_lambda_event_source_mapping` resource docs
- SQS FIFO high throughput mode: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html
- SNS-SQS subscription with raw message delivery: https://docs.aws.amazon.com/sns/latest/dg/sns-large-payload-raw-message-delivery.html

## Issues Found
- **Outdated Lambda runtime**: The Terraform configuration specified `runtime = "nodejs18.x"`. As of June 2026, Node.js 18 is in the AWS Lambda deprecation phase (deprecation began September 2025). Updated to `nodejs20.x`, which is currently supported.

All other technical content was verified as accurate:
- SQS queue attributes (`VisibilityTimeout`, `MessageRetentionPeriod` max 1209600 = 14 days, `ReceiveMessageWaitTimeSeconds` max 20, `DelaySeconds` max 900) — all correct.
- FIFO queue attributes (`FifoQueue`, `ContentBasedDeduplication`, `DeduplicationScope`, `FifoThroughputLimit`) — correctly used for high-throughput mode.
- Standard FIFO throughput stated as 300 msg/sec (3,000 with batching) — correct for default mode.
- `MessageDeduplicationId` 5-minute deduplication window — correct.
- `MaxNumberOfMessages` range 1–10 and batch operations limit of 10 — correct.
- Lambda partial batch failure response format `{ batchItemFailures: [{ itemIdentifier: id }] }` — correct.
- Lambda SQS event record property casing (`record.messageAttributes.X.stringValue`, `record.attributes.ApproximateReceiveCount`) — correct (lowercased in Lambda event payload).
- Terraform `aws_lambda_event_source_mapping` with `scaling_config { maximum_concurrency }` and `function_response_types = ["ReportBatchItemFailures"]` — correct, valid in current AWS provider.
- SNS-SQS fan-out: queue policy allowing `sns.amazonaws.com` with `aws:SourceArn` condition, and `RawMessageDelivery: 'true'` subscription attribute — correct.
- IAM permissions for Lambda-SQS integration (`sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes`, `sqs:ChangeMessageVisibility`) — correct minimum set.
- CloudWatch SQS metric names (`ApproximateNumberOfMessagesVisible`, `ApproximateAgeOfOldestMessage`, etc.) — correct.
- Standard queue at-least-once vs. FIFO exactly-once-processing semantics — correctly stated per AWS terminology.
- DLQ for FIFO must also be FIFO — correct.
- Visibility timeout recommended at least 6x Lambda function timeout — matches AWS guidance.

## Review Notes
- The `AttributeNames` parameter on `ReceiveMessage` (used in both the JS and Python examples) is marked deprecated in newer SDK versions in favor of `MessageSystemAttributeNames`. The deprecated form still works in both AWS SDK for JavaScript v3 and boto3, so the code remains functional. Future revisions could migrate to `MessageSystemAttributeNames`.
- The Best Practices table claims FIFO throughput of "300 msg/sec (3000 with batching)" while the code example enables high-throughput FIFO (`DeduplicationScope: 'messageGroup'`, `FifoThroughputLimit: 'perMessageGroupId'`), under which the per-region limits are substantially higher. The table accurately reflects default FIFO behavior, so this is a teaching-progression nuance rather than an error.
- The Python `_process_single_message` does not explicitly delete messages on `JSONDecodeError` / `ValidationError`; instead it relies on visibility timeout expiry and `maxReceiveCount` to route them to the DLQ. This is intentional per the inline comment, though deleting and forwarding to a dedicated "poison message" handler would be a more efficient alternative.
- The JavaScript consumer's SIGTERM handler sets `isRunning = false` but does not interrupt an in-flight long poll. Worst case, the process waits up to `waitTimeSeconds` (20s) before stopping cleanly — acceptable, but worth noting.

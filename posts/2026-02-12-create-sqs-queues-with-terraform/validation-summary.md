# Validation Summary: How to Create SQS Queues with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon SQS
- Terraform AWS provider
- Amazon SNS queue policies
- AWS Lambda event source mappings
- AWS KMS and SQS server-side encryption
- Amazon CloudWatch metrics

## Sources Consulted
- AWS SQS API Reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/
- AWS SQS message quotas: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html
- AWS SQS high-throughput FIFO documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/enable-high-throughput-fifo.html
- AWS SQS CloudWatch metrics documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- Terraform AWS provider `aws_sqs_queue` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS provider `aws_sqs_queue_redrive_allow_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_redrive_allow_policy
- Terraform AWS provider `aws_lambda_event_source_mapping` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- AWS Lambda SQS partial batch response documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html

## Issues Found
- The standard queue example described 256 KB as the maximum SQS message size and set `max_message_size = 262144`. Current SQS and Terraform provider documentation allow up to 1 MiB, so the example now uses `1048576` and the comment says 1 MiB.
- The redrive allow policy comment said the DLQ accepts messages back from the main queue. The resource actually controls which source queues can use the current queue as a dead-letter queue, so the comment now reflects that direction.
- The FIFO high-throughput explanation claimed up to 3,000 messages per second per message group. Current quotas are region-dependent and batching-dependent, so the text now states the higher-level behavior without an incorrect fixed per-message-group number.
- The monitoring section recommended `NumberOfMessagesSent` on the DLQ for processing failures. AWS documents that automatically redriven messages are not included in that metric, so the recommendation now uses `ApproximateNumberOfMessagesVisible` on the DLQ.

## Review Notes
Terraform was not installed in the local environment, so syntax and resource validation were checked against the current official Terraform AWS provider documentation instead of a local `terraform validate` run.

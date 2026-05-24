# Validation Summary: How to Create Lambda with Dead Letter Queue in Terraform

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Terraform (HCL)
- AWS Lambda
- AWS SQS (Simple Queue Service)
- AWS SNS (Simple Notification Service)
- AWS IAM
- AWS CloudWatch Metric Alarms
- Lambda Event Source Mapping
- Dead Letter Queues (DLQ) for asynchronous Lambda invocations

## Sources Consulted
- AWS Lambda dead-letter queues docs: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html#invocation-dlq
- AWS Lambda async retry behavior (2 retries): https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- Terraform AWS provider `aws_lambda_function` (`dead_letter_config` block, `target_arn`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_sqs_queue` (`sqs_managed_sse_enabled`, `message_retention_seconds`, `visibility_timeout_seconds`, `id` returns URL): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue
- Terraform AWS provider `aws_sqs_queue_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- Terraform AWS provider `aws_sns_topic_subscription` (sqs/email protocols): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider `aws_lambda_event_source_mapping` (`batch_size`, `maximum_batching_window_in_seconds`, `enabled`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping
- Terraform AWS provider `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS SQS CloudWatch metrics (`ApproximateNumberOfMessagesVisible`, namespace `AWS/SQS`): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- AWS Lambda CloudWatch metrics (`Errors`, namespace `AWS/Lambda`): https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
- AWS Lambda runtimes (nodejs20.x): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform `archive_file` data source: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file

## Issues Found
No technical issues found.

## Review Notes
- The post correctly distinguishes Lambda DLQs (legacy, applies to async invocations) from Lambda Destinations, and recommends Destinations as the more modern alternative in the Best Practices section — accurate guidance.
- The SQS retention value `1209600` is correct (14 days, the SQS maximum).
- `aws_sqs_queue_policy.queue_url = aws_sqs_queue.dlq_persistence.id` is correct because the `id` attribute of `aws_sqs_queue` exports the queue URL. The explicit `.url` attribute also works in current provider versions; both are acceptable.
- The email SNS subscription (`aws_sns_topic_subscription` with `protocol = "email"`) will be created in `PendingConfirmation` state until the recipient confirms via the email link — this is expected AWS behavior, not a bug.
- Minor design consideration (not a technical error): the DLQ reprocessor Lambda reuses the same IAM role as the original processor and lacks its own DLQ; in production, a separate role and reprocessor-specific failure handling would be cleaner. Left as-is since it's a style/design choice rather than incorrect code.
- The `archive_file` data source requires the `hashicorp/archive` provider; modern Terraform (1.0+) typically expects this in a `required_providers` block, but the example will still work because Terraform auto-detects the provider. Not an error.

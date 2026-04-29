# Validation Summary: How to Configure Lambda Dead Letter Queues with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Lambda asynchronous invocation settings
- Amazon SQS dead-letter queues
- Amazon CloudWatch alarms
- AWS IAM

## Sources Consulted
- AWS Lambda Developer Guide: Capturing records of Lambda asynchronous invocations — https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- AWS Lambda Developer Guide: Configuring error handling settings for Lambda asynchronous invocations — https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-configuring.html
- AWS Lambda Developer Guide: How Lambda handles errors and retries with asynchronous invocation — https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda Developer Guide: Using event filtering with an Amazon SQS event source — https://docs.aws.amazon.com/lambda/latest/dg/with-sqs-filtering.html
- AWS Lambda Developer Guide: Types of metrics for Lambda functions — https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Amazon SQS Developer Guide: Creating alarms for dead-letter queues using Amazon CloudWatch — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/dead-letter-queues-alarms-cloudwatch.html
- Amazon SQS Developer Guide: Encryption at rest in Amazon SQS — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-server-side-encryption.html
- OpenTofu Docs: Basic CLI Features — https://opentofu.org/docs/cli/commands/
- Terraform Registry: `aws_lambda_function_event_invoke_config` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function_event_invoke_config
- Terraform Registry: `aws_lambda_event_source_mapping` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_event_source_mapping

## Issues Found

1. **The SQS queue policy block was misleading for Lambda DLQ delivery.** AWS documents DLQ delivery permissions on the Lambda function execution role (`sqs:SendMessage` for SQS), not on a queue policy that grants `lambda.amazonaws.com`. I removed the extra `aws_sqs_queue_policy` block and kept the execution role permission.

2. **The Step 4 event filtering example was incorrect.** For SQS event source mappings, Lambda supports filtering only on the SQS message body. Lambda DLQ failure details such as `ErrorCode` and `ErrorMessage` are added as SQS message attributes, not inside the body, so the `requestContext.condition = ["RetriesExhausted"]` filter would not work. I removed the invalid `filter_criteria` block.

3. **Step 4 described creating a function, but the code only created an event source mapping.** I renamed the step and updated the code comment so the explanation matches what the configuration actually does.

4. **A few behavioral comments were too narrow or incomplete.** I updated the introduction and inline comments to reflect that asynchronous events can also be sent to the DLQ when they exceed `maximum_event_age_in_seconds`, not only when function-error retries are exhausted. I also added CloudWatch to the prerequisites because the example creates a CloudWatch alarm.

## Review Notes
- The post references `aws_lambda_function.reprocessor` but does not show that function or its execution role. That is acceptable for a focused snippet, but in a full implementation the reprocessor must have the normal SQS consumer permissions, and because the DLQ is encrypted, it may also need `kms:Decrypt` depending on the queue key setup.

# Validation Summary: How to Create Lambda with Destinations in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.0+)
- AWS Lambda (async invocations, destinations, event invoke config)
- AWS SQS (queues, SSE, message retention)
- AWS SNS (topics, subscriptions)
- AWS EventBridge (custom event bus, rules, targets)
- AWS IAM (roles, role policies, policy attachments)
- AWS CloudWatch (metric alarms for Lambda errors and SQS queue depth)
- Node.js 20.x Lambda runtime

## Sources Consulted
- Terraform AWS provider docs: `aws_lambda_function_event_invoke_config` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function_event_invoke_config)
- Terraform AWS provider docs: `aws_lambda_function`, `aws_sqs_queue`, `aws_sns_topic`, `aws_cloudwatch_event_bus`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, `aws_cloudwatch_metric_alarm`
- AWS Lambda Developer Guide: Asynchronous invocation and destinations (https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html)
- AWS Lambda Developer Guide: Lambda runtimes (`nodejs20.x` confirmed supported)
- AWS Lambda EventBridge destination event schema (source `lambda`, detail-type `Lambda Function Invocation Result - Success` / `... - Failure`)
- AWS SQS docs (max `message_retention_seconds` is 1209600 = 14 days; `sqs_managed_sse_enabled` attribute)
- AWS CloudWatch metrics: `AWS/SQS` `ApproximateNumberOfMessagesVisible`, `AWS/Lambda` `Errors`

## Issues Found
No technical issues found.

Verified specifically:
- `aws_lambda_function_event_invoke_config` resource shape with nested `destination_config { on_success {}, on_failure {} }` matches the AWS provider schema.
- `maximum_retry_attempts = 2` (valid: 0-2) and `maximum_event_age_in_seconds` values 3600 and 7200 (valid: 60-21600) are within allowed ranges.
- Supported destination target types (SQS, SNS, Lambda, EventBridge) are accurate.
- EventBridge `detail-type` strings used in the rule patterns match what Lambda actually emits.
- IAM permissions list the correct API actions for each target type (`sqs:SendMessage`, `sns:Publish`, `lambda:InvokeFunction`, `events:PutEvents`).
- `nodejs20.x` is a current, supported Lambda runtime as of the post date.
- CloudWatch alarm metric names and namespaces are correct.

## Review Notes
- The EventBridge-to-SQS target (`aws_cloudwatch_event_target.failure_to_sqs`) is syntactically valid, but in a complete deployment the SQS queue would also need a resource-based policy granting `events.amazonaws.com` permission to call `sqs:SendMessage` (or alternatively an EventBridge role via `role_arn`). The Terraform code itself is correct — this is a deployment-completeness observation, not an error in the snippet.
- The post repeatedly uses the same `aws_lambda_function_event_invoke_config` `function_name` (the `processor`) across several examples (SQS, chaining, SNS, EventBridge). In a single Terraform configuration only one `aws_lambda_function_event_invoke_config` per function/qualifier can exist; readers should treat the SNS/EventBridge sections as alternatives rather than additive resources. The post implicitly treats them as standalone examples, which is fine for a tutorial.
- `maximum_event_age_in_seconds` upper bound is 21600 (6 hours); the post's values (3600, 7200) are well within range. No issue.

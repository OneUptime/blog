# Validation Summary: How to Create Serverless Cron Jobs with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (hashicorp/aws provider)
- AWS Lambda (Python 3.12 runtime)
- Amazon EventBridge (formerly CloudWatch Events) — `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`
- AWS IAM (roles, managed/inline policies)
- Amazon SQS (dead letter queue)
- Amazon SNS (alert topics)
- Amazon CloudWatch (metric alarms, log groups)
- Amazon DynamoDB and S3 (referenced as cron job targets)

## Sources Consulted
- AWS EventBridge — Schedule expressions for rules (cron and rate syntax): https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- AWS Lambda — Configuring functions (timeout, memory, runtimes): https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS provider — `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider — `aws_cloudwatch_event_target` (retry_policy, dead_letter_config): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider — `aws_lambda_function`, `aws_lambda_permission`, `aws_sqs_queue`, `aws_cloudwatch_metric_alarm`
- AWS Lambda CloudWatch metrics (Duration reported in milliseconds): https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
- AWS SQS quotas (message retention 60 s – 1,209,600 s / 14 days): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-quotas.html
- AWS managed policy `AWSLambdaBasicExecutionRole` ARN

## Issues Found
No technical issues found.

Detailed verification:
- All 7 cron expressions follow AWS EventBridge's 6-field syntax (`Minutes Hours Day-of-month Month Day-of-week Year`) with the required `?`/`*` mutual-exclusion between day-of-month and day-of-week. Each expression correctly maps to its claimed schedule.
- All rate expressions correctly apply the singular-for-1, plural-for-N rule (`rate(1 minute)`, `rate(6 hours)`, etc.).
- Lambda `timeout = 900` matches the documented 15-minute maximum; `python3.12` is a valid runtime identifier.
- `aws_cloudwatch_event_target.retry_policy` correctly uses `maximum_event_age_in_seconds` and `maximum_retry_attempts`; `dead_letter_config.arn` is the correct nested-block field.
- The CloudWatch Lambda Duration metric is reported in milliseconds, so `threshold = each.value.timeout * 800` correctly expresses "80% of timeout" when `timeout` is in seconds (seconds × 1000 × 0.8 = seconds × 800).
- SQS `message_retention_seconds = 1209600` is exactly the 14-day documented maximum.
- IAM managed policy ARN `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole` is correct.
- `events.amazonaws.com` is the correct service principal for EventBridge Rules invoking Lambda via `aws_lambda_permission`.

## Review Notes
- The post uses the classic EventBridge Rules API (`aws_cloudwatch_event_rule` / `aws_cloudwatch_event_target`), which remains fully supported. AWS now also offers EventBridge Scheduler (`aws_scheduler_schedule`, service principal `scheduler.amazonaws.com`) as a newer, dedicated scheduling service with features like one-time schedules, flexible time windows, and per-schedule IAM roles. A future revision could mention EventBridge Scheduler as the newer alternative, but the existing approach is technically correct and widely used.
- The `aws_cloudwatch_event_target` resource defines both a `retry_policy` and `dead_letter_config`, but the corresponding Lambda function does not have its own `dead_letter_config` block — that's intentional in this design (DLQ is at the event-target level for failed event delivery, not Lambda-internal failures). Readers should be aware these are different DLQ semantics: the EventBridge target DLQ captures undeliverable events; a Lambda-attached DLQ would capture asynchronous invocation failures inside the function.
- The error alarm uses `threshold = 0` with `GreaterThanThreshold`, which fires on any error. This is a reasonable strict policy but produces noise on transient failures; some teams prefer a small threshold (e.g., 1–3 over a longer evaluation window) to reduce false positives.
- The example `aws_lambda_function` resources reference `data.archive_file` and other resources (`aws_dynamodb_table.main`, `aws_s3_bucket.reports`, `aws_sns_topic.reports`, `aws_sns_topic.alerts`, `aws_sns_topic.digest`) that are not defined in the post — readers are expected to provide these. This is typical for a focused tutorial and is acceptable.

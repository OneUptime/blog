# Validation Summary: How to Build a Scheduled Task System on AWS Without Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EventBridge Scheduler
- AWS Lambda
- AWS Step Functions
- Amazon SQS dead-letter queues
- Amazon DynamoDB
- Amazon CloudWatch custom metrics
- Amazon SNS
- AWS IAM
- AWS CloudFormation
- Python boto3

## Sources Consulted
- AWS EventBridge Scheduler schedule types: https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html
- AWS EventBridge Scheduler CreateSchedule API: https://docs.aws.amazon.com/scheduler/latest/APIReference/API_CreateSchedule.html
- AWS EventBridge Scheduler RetryPolicy API: https://docs.aws.amazon.com/scheduler/latest/APIReference/API_RetryPolicy.html
- AWS EventBridge Scheduler templated targets: https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-targets-templated.html
- AWS EventBridge Scheduler context attributes: https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-schedule-context-attributes.html
- AWS EventBridge Scheduler quotas: https://docs.aws.amazon.com/scheduler/latest/UserGuide/scheduler-quotas.html
- Amazon EventBridge quotas: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-quota.html
- AWS Lambda asynchronous invocation error handling: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- AWS Lambda retry behavior: https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html
- AWS Step Functions Inline Map state: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS CloudFormation DynamoDB table reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html
- AWS CloudFormation DynamoDB global secondary index reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-dynamodb-table-globalsecondaryindex.html
- Referenced OneUptime DLQ article checked for URL validity: https://oneuptime.com/blog/post/2026-02-12-build-a-dead-letter-queue-processing-system-on-aws/view

## Issues Found
- Sample AWS account IDs were 9 digits, which made the sample ARNs malformed. Updated them to the standard 12-digit example account ID `123456789012`.
- The Scheduler IAM role allowed Lambda invocation and SQS DLQ writes but did not allow Step Functions execution. Added `states:StartExecution` to match the later Step Functions Scheduler target.
- The post implied EventBridge Scheduler retry policy retries Lambda function-code failures. Updated wording to clarify that Scheduler retry policies and Scheduler DLQs apply to delivery failures, while Lambda function-code failures after accepted async invocation are handled by Lambda asynchronous retry and Lambda failure destinations or DLQs.
- The task router comment said re-raising would trigger Scheduler retries. Updated it to say re-raising records the Lambda async invocation failure.
- The Step Functions Map example used the deprecated `Iterator` field. Replaced it with `ItemProcessor`, which AWS currently recommends for Inline Map states.
- The Step Functions schedule input used `{{$.time}}`, which is not an EventBridge Scheduler context attribute. Replaced it with `<aws.scheduler.scheduled-time>`.
- The monitoring section referred to CloudWatch metric filters, but the code publishes metrics directly with `put_metric_data`. Updated the wording to "custom CloudWatch metrics."

## Review Notes
- Python code blocks were checked for syntax with Python `ast.parse`.
- The JSON Step Functions definition was parsed successfully as JSON after edits.
- The CloudFormation YAML snippet was parsed with PyYAML using a handler for the `!GetAtt` intrinsic. `cfn-lint` was not installed in the workspace, so full CloudFormation semantic linting was not run.
- The failure handler assumes a `FailedTasks` DynamoDB table and SNS topic already exist; the post presents it as an example handler, so no structural changes were made.

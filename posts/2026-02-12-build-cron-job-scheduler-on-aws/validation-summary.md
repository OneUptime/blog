# Validation Summary: How to Build a Cron Job Scheduler on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon EventBridge rules
- Amazon EventBridge Scheduler
- AWS Step Functions
- Amazon DynamoDB
- Amazon CloudWatch alarms
- Amazon ECS scheduled tasks on AWS Fargate
- AWS CDK v2
- AWS SDK for JavaScript v3

## Sources Consulted
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda timeout documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- Amazon EventBridge scheduled rule cron expression documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Amazon EventBridge Scheduler target and DLQ documentation: https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-targets.html and https://docs.aws.amazon.com/scheduler/latest/UserGuide/configuring-schedule-dlq.html
- AWS Lambda guide for invoking functions with EventBridge Scheduler: https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html
- AWS CDK v2 `aws_events.Schedule` and `CronOptions` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Schedule.html and https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.CronOptions.html
- AWS CDK v2 `aws_scheduler.CfnSchedule` and `RetryPolicyProperty` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_scheduler.CfnSchedule.html and https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_scheduler.CfnSchedule.RetryPolicyProperty.html
- AWS CDK v2 CloudWatch `Alarm` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudwatch.Alarm.html
- AWS CDK v2 EventBridge target `EcsTask` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.EcsTask.html
- Amazon DynamoDB `Scan` API reference and scan developer guide: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html and https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html
- AWS Step Functions service integrations documentation: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-service-integrations.html
- Amazon EventBridge pricing: https://aws.amazon.com/eventbridge/pricing/

## Issues Found
- The Lambda CDK example used `lambda.Runtime.NODEJS_18_X`, which is deprecated as of September 1, 2025. Updated it to `lambda.Runtime.NODEJS_22_X`, which is a supported Lambda runtime on the review date.
- The DynamoDB cleanup Lambda performed a single `ScanCommand`, but DynamoDB scan results are paginated at up to 1 MB and require `LastEvaluatedKey` / `ExclusiveStartKey` handling for a complete scan. Updated the example to scan until no `LastEvaluatedKey` remains and to safely handle empty result pages.
- The EventBridge Scheduler DLQ example configured `deadLetterConfig` but did not grant the schedule execution role permission to send messages to the SQS DLQ. Added `deadLetterQueue.grantSendMessages(schedulerRole)`.
- The cron reference used numeric day-of-week value `2` for Monday. Replaced it with `MON` to avoid ambiguity while matching AWS cron syntax.
- The CloudWatch alarm intended to detect a daily Lambda that did not run omitted `treatMissingData`. Since the default is missing-data behavior, the alarm could remain in insufficient data instead of alarming when invocations are absent. Added `cloudwatch.TreatMissingData.BREACHING`.

## Review Notes
The corrected TypeScript CDK APIs were checked against current `aws-cdk-lib`, and the corrected JavaScript Lambda snippet passed `node --check`. The examples remain intentionally illustrative and still assume the referenced DynamoDB table, SQS DLQ, ECS cluster/networking, and application-specific IAM permissions are defined appropriately in the surrounding stack.

# Validation Summary: How to Trigger Lambda Functions on a Schedule (Cron)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon EventBridge scheduled rules
- EventBridge Scheduler
- AWS CDK v2
- AWS CLI
- JavaScript / Node.js
- Amazon S3
- Amazon DynamoDB
- Amazon SQS
- Amazon CloudWatch

## Sources Consulted
- AWS EventBridge User Guide: Creating a scheduled rule (legacy): https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- AWS EventBridge User Guide: Setting a schedule pattern for scheduled rules: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- AWS EventBridge events detail reference: https://docs.aws.amazon.com/eventbridge/latest/userguide/event-reference.html
- EventBridge Scheduler User Guide: Schedule types, time zones, and daylight saving time: https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html
- AWS CDK API Reference: aws_events.Schedule: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Schedule.html
- AWS CDK API Reference: aws_events.CronOptions: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.CronOptions.html
- AWS CLI Command Reference: aws events put-rule: https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI Command Reference: aws events put-targets: https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- AWS CLI Command Reference: aws lambda add-permission: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS Lambda FAQs: https://aws.amazon.com/lambda/faqs/

## Issues Found
- The post described EventBridge as "formerly CloudWatch Events" without clarifying that the CDK and AWS CLI examples use EventBridge scheduled rules, which AWS now labels as a legacy feature. Added a narrow clarification that scheduled rules were formerly part of CloudWatch Events and that AWS recommends EventBridge Scheduler for newer scheduling workflows.
- The post stated that AWS cron does not support "last day of month" directly. AWS EventBridge cron supports the `L` wildcard in the day-of-month field. Replaced that claim with a CDK example using `day: 'L'` and kept the daily in-function check as an optional defensive pattern.
- The timezone section broadly stated that EventBridge cron expressions use UTC and have no automatic timezone adjustment. That is true for EventBridge scheduled rules, but EventBridge Scheduler supports named time zones and daylight saving time adjustment. Updated the wording to distinguish scheduled rules from EventBridge Scheduler.

## Review Notes
The AWS CDK scheduled rule examples, AWS CLI commands, scheduled event payload fields, Lambda 15-minute timeout claim, SQS batch size usage, and one-minute schedule precision were checked against official AWS documentation and are technically valid. Scheduled rules remain supported, but EventBridge Scheduler is the more current AWS recommendation for new scheduled-task workflows.

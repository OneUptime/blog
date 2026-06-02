# Validation Summary: Use EventBridge Scheduler for Cron and One-Time Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EventBridge Scheduler
- Amazon EventBridge scheduled rules
- AWS CLI
- AWS SDK for JavaScript v3
- AWS Lambda
- AWS Step Functions
- Amazon SQS
- IAM execution roles

## Sources Consulted
- Amazon EventBridge Scheduler API Reference: CreateSchedule - https://docs.aws.amazon.com/scheduler/latest/APIReference/API_CreateSchedule.html
- Amazon EventBridge Scheduler API Reference: FlexibleTimeWindow - https://docs.aws.amazon.com/scheduler/latest/APIReference/API_FlexibleTimeWindow.html
- Amazon EventBridge Scheduler API Reference: Target - https://docs.aws.amazon.com/scheduler/latest/APIReference/API_Target.html
- Amazon EventBridge Scheduler API Reference: RetryPolicy - https://docs.aws.amazon.com/scheduler/latest/APIReference/API_RetryPolicy.html
- Amazon EventBridge Scheduler API Reference: DeadLetterConfig - https://docs.aws.amazon.com/scheduler/latest/APIReference/API_DeadLetterConfig.html
- EventBridge Scheduler schedule types - https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html
- EventBridge Scheduler universal targets - https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-targets-universal.html
- EventBridge Scheduler quotas - https://docs.aws.amazon.com/scheduler/latest/UserGuide/scheduler-quotas.html
- Amazon EventBridge quotas - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-quota.html
- Amazon EventBridge PutTargets API Reference - https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutTargets.html
- AWS SDK for JavaScript v3 Scheduler CreateScheduleCommand - https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/scheduler-2021-06-30/CreateSchedule

## Issues Found
- Corrected EventBridge Scheduler quota wording from "millions of schedules per account" to "millions of schedules per Region" and clarified that EventBridge rules are 300 per bus in most Regions.
- Corrected the EventBridge rules comparison table to show that EventBridge rules do support dead letter queues on targets.
- Changed "midnight EST every day" to "midnight Eastern time every day" because the `America/New_York` time zone observes daylight saving time.
- Replaced invalid 9-digit placeholder AWS account IDs with 12-digit placeholder account IDs in Lambda, IAM, SQS, Step Functions, and SQS QueueUrl examples.
- Replaced invalid `MaximumWindowInSeconds` fields with `MaximumWindowInMinutes` in AWS CLI and JavaScript SDK examples, using equivalent window lengths of 15, 30, and 60 minutes.
- Updated the universal target claim to say Scheduler can invoke over 6,000 API operations across over 270 AWS services, matching AWS documentation.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was checked against the official AWS API and documentation rather than local `aws --help` output.

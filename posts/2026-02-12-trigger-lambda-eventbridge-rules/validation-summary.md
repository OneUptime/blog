# Validation Summary: How to Trigger Lambda Functions from EventBridge Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EventBridge event buses and rules
- AWS Lambda
- AWS CDK v2
- AWS SDK for JavaScript v3
- Node.js
- Amazon EC2 state change events
- AWS CodePipeline events
- Amazon CloudWatch alarm events
- Amazon S3 events via EventBridge
- Amazon SQS dead-letter queues
- Amazon SNS comparison

## Sources Consulted
- Amazon EventBridge User Guide: Sending events with PutEvents - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-putevents.html
- Amazon EventBridge User Guide: Comparison operators for event patterns - https://docs.aws.amazon.com/eventbridge/latest/userguide/content-filtering-with-event-patterns.html
- Amazon EventBridge User Guide: How EventBridge retries delivering events - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html
- Amazon EventBridge User Guide: Using dead-letter queues to process undelivered events - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html
- Amazon EventBridge User Guide: EventBridge quotas - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-quota.html
- AWS CDK v2 API Reference: EventPattern - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.EventPattern.html
- AWS CDK v2 API Reference: LambdaFunctionProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.LambdaFunctionProps.html
- AWS CDK v2 API Reference: EventField - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.EventField.html
- AWS Lambda Developer Guide: Configuring error handling settings for Lambda asynchronous invocations - https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-configuring.html
- Amazon CloudWatch User Guide: Alarm events and EventBridge - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-and-eventbridge.html
- Amazon S3 User Guide: Using EventBridge - https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html
- AWS CodePipeline User Guide: Monitoring CodePipeline events - https://docs.aws.amazon.com/codepipeline/latest/userguide/detect-state-changes-cloudwatch-events.html

## Issues Found
- The post stated that each custom EventBridge event can be up to 256 KB. Current EventBridge documentation states that `PutEvents` can include up to 10 entries and that the total request size must be less than 1 MB. Updated the limit text accordingly.
- The retry section said EventBridge retries failed Lambda invocations for up to 24 hours. EventBridge retry policies apply to target delivery failures, while Lambda function errors are handled by Lambda's own asynchronous invocation retry and failure configuration. Updated the wording to distinguish EventBridge-to-Lambda delivery from Lambda-level error handling.

## Review Notes
The CDK snippets use current AWS CDK v2 constructs and properties. The EventBridge event patterns for EC2, CodePipeline, CloudWatch alarms, and S3 object creation match the documented event shapes. The S3 note correctly calls out that EventBridge notifications must be enabled on the bucket.

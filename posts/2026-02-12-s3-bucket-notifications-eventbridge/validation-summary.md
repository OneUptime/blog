# Validation Summary: How to Set Up S3 Bucket Notifications to EventBridge

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- Amazon EventBridge
- AWS CLI
- AWS Lambda
- Amazon SQS
- AWS Step Functions
- Amazon CloudWatch
- IAM resource policies and cross-account EventBridge routing

## Sources Consulted
- Amazon S3 User Guide: Enabling Amazon EventBridge: https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-event-notifications-eventbridge.html
- Amazon S3 User Guide: Using EventBridge: https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html
- Amazon S3 User Guide: EventBridge event message structure: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ev-events.html
- Amazon EventBridge Events Reference: Amazon S3 events: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-s3.html
- AWS CLI Command Reference: s3api put-bucket-notification-configuration: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-notification-configuration.html
- AWS CLI Command Reference: events create-archive: https://docs.aws.amazon.com/cli/latest/reference/events/create-archive.html
- AWS CLI Command Reference: events start-replay: https://docs.aws.amazon.com/cli/latest/reference/events/start-replay.html
- Amazon EventBridge User Guide: Event bus targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- Amazon EventBridge User Guide: Using resource-based policies: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon EventBridge User Guide: Creating event patterns: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html
- Amazon EventBridge Events Reference: Delivery level for AWS service events: https://docs.aws.amazon.com/eventbridge/latest/ref/event-delivery-level.html
- Amazon EventBridge pricing: https://aws.amazon.com/eventbridge/pricing/

## Issues Found
1. **Multiple targets claim omitted the EventBridge rule target quota.** Changed the benefit text to say a rule can send to up to five targets, matching EventBridge target limits.
2. **Lambda target setup omitted the required Lambda resource permission.** Added an `aws lambda add-permission` command so EventBridge is allowed to invoke the function target.
3. **Prefix-and-extension filter example only matched a prefix.** Replaced it with a `wildcard` pattern for `uploads/images/*.jpg` so the example matches both the prefix and file extension; multiple values on one EventBridge field are ORed, not ANDed.
4. **S3 EventBridge event-type list was incomplete.** Added `Async Copy Completion` and `Object Access Tier Changed`, which are listed in current AWS documentation as direct S3 service events.
5. **Sample EventBridge event omitted the documented `resources` field.** Added the S3 bucket ARN to the example event.
6. **Archive creation used the wrong AWS CLI option.** Replaced `--source-arn` with `--event-source-arn` for `aws events create-archive`.
7. **Replay example used the event bus ARN as the event source.** Changed `--event-source-arn` to the archive ARN, while keeping the destination as the event bus.
8. **Cost note inaccurately implied all S3 events are billed as published events.** Updated it to reflect that AWS service-event ingestion to the default bus is free, while archive, replay, cross-account delivery, and target services can still incur charges.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI validation was performed against the current official AWS CLI command reference rather than local `--help` output. For SQS and SNS targets, production setups also need resource policies that permit EventBridge to send messages; the post's examples are syntactically valid but should include those policies in a fuller end-to-end IAM walkthrough.

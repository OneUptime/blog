# Validation Summary: How to Enable RDS Event Notifications via SNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS event notifications
- Amazon SNS topics and subscriptions
- AWS CLI
- AWS Lambda
- Python
- Slack incoming webhooks

## Sources Consulted
- Amazon RDS User Guide: Working with Amazon RDS event notification - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html
- Amazon RDS User Guide: Subscribing to Amazon RDS event notification - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Subscribing.html
- Amazon RDS User Guide: Overview of Amazon RDS event notification - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.overview.html
- Amazon RDS User Guide: Amazon RDS event categories and event messages - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- Amazon Aurora User Guide: Amazon RDS event categories and event messages for Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_Events.Messages.html
- AWS CLI Command Reference: rds create-event-subscription - https://docs.aws.amazon.com/cli/latest/reference/rds/create-event-subscription.html
- AWS CLI Command Reference: rds describe-events - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-events.html
- AWS CLI Command Reference: rds describe-event-categories - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-event-categories.html
- AWS Lambda Developer Guide: Using AWS Lambda with Amazon RDS - https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html
- AWS Lambda Developer Guide: Invoking Lambda functions with Amazon SNS notifications - https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html

## Issues Found
- The DB instance event category table described `availability` as covering instance started and stopped events. AWS documents DB instance shutdown, restart, restart errors, and storage-full shutdown conditions under `availability`, while DB instance started/stopped events are `notification` events. Updated the `availability` row and added a separate `notification` row.
- The same table described `notification` as covering storage exhaustion and approaching limits. AWS documents allocated-storage exhaustion and low free storage under the `low storage` category. Added a `low storage` row and moved that description there.

## Review Notes
- The AWS CLI commands use valid RDS, SNS, and Lambda options according to the current AWS CLI reference.
- The Lambda example matches the official SNS-to-Lambda event shape for Amazon RDS notifications, where the RDS message is wrapped in the SNS event and the RDS message body is a JSON string with fields such as `Source ID` and `Event Message`.
- The local target posts for the internal OneUptime links exist in the repository.

# Validation Summary: How to Use EventBridge API Destinations for Webhooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EventBridge
- EventBridge API Destinations
- EventBridge Connections
- AWS CLI
- AWS IAM
- AWS Secrets Manager
- Amazon CloudWatch metrics and alarms
- Amazon SQS dead-letter queues
- Slack Web API
- PagerDuty Events API v2

## Sources Consulted
- Amazon EventBridge User Guide: API destinations as targets in Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-api-destinations.html
- Amazon EventBridge User Guide: Create an API destination - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-api-destination-create.html
- Amazon EventBridge User Guide: Authorization methods for connections - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-target-connection-auth.html
- Amazon EventBridge API Reference: CreateApiDestination - https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_CreateApiDestination.html
- Amazon EventBridge API Reference: ApiDestination ARN format - https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_ApiDestination.html
- AWS CLI Command Reference: events create-connection - https://docs.aws.amazon.com/cli/latest/reference/events/create-connection.html
- AWS CLI Command Reference: events put-targets - https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- Amazon EventBridge User Guide: Input transformation - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html
- Amazon EventBridge User Guide: IAM roles for sending events to targets - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-iam-roles.html
- Amazon EventBridge User Guide: Retry policy - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html
- Amazon EventBridge User Guide: Monitoring Amazon EventBridge - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html

## Issues Found
- The `create-api-destination` example used a connection ARN without the generated connection ID suffix. AWS requires the full connection ARN in the form `connection/name/id`, so the example was updated to include a placeholder ID suffix.
- The `put-targets` examples used API destination ARNs without the generated API destination ID suffix. AWS API destination ARNs use the form `api-destination/name/id`, so the examples were updated to include a placeholder ID suffix.
- The IAM policy snippet was marked as JSON but included a `//` comment, which is not valid JSON. The comment was removed.
- The EventBridge metric descriptions for `Invocations`, `InvocationAttempts`, and `FailedInvocations` were slightly imprecise. They were updated to match AWS CloudWatch metric definitions more closely.

## Review Notes
- The AWS CLI was not installed in the local workspace, so CLI syntax was checked against the official AWS CLI command reference instead of local `--help` output.
- The post's examples use placeholder credentials, account IDs, resource IDs, and endpoint-specific values. Users still need to replace those with the ARNs returned by their own `create-connection` and `create-api-destination` calls.

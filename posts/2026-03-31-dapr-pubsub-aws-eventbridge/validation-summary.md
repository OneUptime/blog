# Validation Summary: How to Set Up Dapr Pub/Sub with AWS EventBridge

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub component: `pubsub.aws.snssqs`)
- AWS SNS (Simple Notification Service)
- AWS SQS (Simple Queue Service)
- AWS EventBridge (custom event bus, rules, targets)
- AWS IAM (resource-based policies, IRSA)
- Python (Dapr SDK, boto3, Flask)
- Kubernetes (secrets, EKS)

## Sources Consulted
- Dapr AWS SNS/SQS pub/sub component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr components-contrib SNS/SQS source — https://github.com/dapr/components-contrib/blob/main/pubsub/aws/snssqs/snssqs.go
- AWS EventBridge resource-based policies — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS EventBridge targets documentation — https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- AWS SQS EventBridge integration — https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-automating-using-eventbridge.html
- AWS CLI reference for `events`, `sns`, `sqs` commands

## Issues Found
- **Missing SQS resource-based policy for EventBridge**: The `aws sqs set-queue-attributes` command only granted `sqs:SendMessage` permission to `sns.amazonaws.com`, but the EventBridge rule also targets the same SQS queue. Without a policy statement allowing `events.amazonaws.com` to call `sqs:SendMessage`, EventBridge event delivery to SQS would silently fail. Added a second policy statement granting EventBridge permission. Updated the comment from "Allow SNS to publish to SQS" to "Allow SNS and EventBridge to publish to SQS".

## Review Notes
- The architecture diagram shows a linear chain (SNS → EventBridge → SQS), but the actual setup configures two parallel paths: (1) Dapr → SNS → SQS via direct SNS subscription, and (2) direct EventBridge publishes → SQS via EventBridge rules. SNS is not explicitly connected to EventBridge in the setup. The `publish_directly_to_eventbridge` function correctly publishes to the custom event bus, but events published via Dapr's SNS path go directly to SQS without passing through EventBridge. This is an architectural design choice that readers should be aware of.
- All Dapr component metadata fields (`messageReceiveLimit`, `sqsDeadLettersQueueName`, `assetsManagementTimeoutSeconds`, `disableEntityManagement`) are valid and correctly named per the official Dapr SNS/SQS component reference.
- The Python publisher and subscriber code is syntactically correct and uses current Dapr SDK APIs.
- All AWS CLI commands use correct flags and syntax.
- The IAM policy is functional, though `sns:ListTopics` and `sqs:ListQueues` do not support resource-level restrictions — the wildcard resource pattern won't effectively restrict those actions but won't cause errors.

# Validation Summary: How to Configure Dapr with AWS SNS/SQS Pub/Sub

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (pub/sub building block, SNS/SQS component)
- AWS SNS (Simple Notification Service)
- AWS SQS (Simple Queue Service)
- AWS IAM (permissions policy)
- AWS EKS with IRSA (IAM Roles for Service Accounts)
- AWS CloudWatch (monitoring)
- Node.js / Express (subscriber example)
- Kubernetes (service account annotation, declarative subscriptions)

## Sources Consulted
- Dapr SNS/SQS pub/sub component specification: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr declarative subscription spec: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- AWS IAM ARN format documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html
- AWS EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- AWS CloudWatch CLI reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html

## Issues Found
1. **Invalid AWS account ID in IRSA example**: The `kubectl annotate` command used `arn:aws:iam::123456789:role/dapr-pubsub-role` with a 9-digit account ID. AWS account IDs are always 12 digits. Fixed to `arn:aws:iam::123456789012:role/dapr-pubsub-role` to use a proper 12-digit placeholder.

## Review Notes
- The Dapr component type `pubsub.snssqs`, API version `dapr.io/v1alpha1`, and all metadata field names (`region`, `accessKey`, `secretKey`, `sqsDeadLettersQueueName`, `messageVisibilityTimeout`, `messageRetryLimit`, `messageWaitTimeSeconds`) are correct per the Dapr SNS/SQS component specification.
- The subscription YAML uses `dapr.io/v1alpha1` with the `route` field. This is valid and supported, though other posts in this blog use `dapr.io/v2alpha1` with `routes.default`. Both versions work; v2alpha1 adds content-based routing features.
- The IAM policy includes `sqs:SendMessage`, which is not strictly required for the Dapr SNS/SQS component (messages flow through SNS to SQS via a resource-based queue policy, not the caller's IAM permissions). It is not harmful to include but is slightly broader than necessary.
- The publish API path `/v1.0/publish/<pubsubname>/<topic>` is correct.
- The Node.js Express subscriber code correctly extracts `data` from the CloudEvent envelope that Dapr delivers.
- The CloudWatch CLI command is syntactically correct with valid parameters for monitoring SQS queue depth.

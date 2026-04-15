# Validation Summary: How to Configure AWS SNS/SQS for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (pub/sub building block)
- AWS SNS (Simple Notification Service)
- AWS SQS (Simple Queue Service)
- AWS CLI
- AWS IAM
- Kubernetes (secrets, component CRDs)
- Python (Dapr SDK)

## Sources Consulted
- [Dapr AWS SNS/SQS component reference](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/) - component type name, metadata field names, DLQ configuration requirements
- [Dapr Component spec schema](https://docs.dapr.io/reference/resource-specs/component-schema/) - scopes field placement
- [Dapr component scopes how-to](https://docs.dapr.io/operations/components/component-scopes/) - scopes configuration
- [Dapr Python SDK client source](https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py) - publish_event method signature and data parameter types
- [Dapr Python SDK pub/sub examples](https://github.com/dapr/python-sdk/tree/main/examples/pubsub-simple) - idiomatic usage patterns
- [AWS CLI SNS subscribe reference](https://docs.aws.amazon.com/cli/latest/reference/sns/subscribe.html) - --notification-endpoint parameter

## Issues Found

1. **Component type name outdated**: Changed `pubsub.snssqs` to `pubsub.aws.snssqs` in both YAML examples. The `pubsub.snssqs` name was used in Dapr v1.9-v1.10; current versions (v1.11+) use the `pubsub.aws.snssqs` naming convention.

2. **Incorrect metadata field `sqsWaitTimeSeconds`**: Changed to `messageWaitTimeSeconds`. The field `sqsWaitTimeSeconds` does not exist in the Dapr SNS/SQS component spec; the correct field for SQS long-polling wait time is `messageWaitTimeSeconds`.

3. **Incorrect metadata field `messageRetryLimit` for DLQ config**: Changed to `messageReceiveLimit`. When configuring dead-letter queues, the Dapr docs require both `sqsDeadLettersQueueName` and `messageReceiveLimit` to be set together. `messageRetryLimit` is a separate field that controls Dapr-level retries, not the SQS receive count for DLQ routing.

4. **Python `publish_event` data parameter type**: The `data` parameter accepts `str` or `bytes`, not a `dict`. Changed `data=event_data` to `data=json.dumps(event_data)`, added `import json`, added `data_content_type='application/json'`, and updated the import to the idiomatic `from dapr.clients import DaprClient`.

5. **AWS account ID format**: Changed `123456789` (9 digits) to `123456789012` (12 digits) in all example ARNs. AWS account IDs are always 12 digits; using the standard placeholder format avoids confusion.

## Review Notes
- The IAM policy uses `"Resource": "*"` which is functional but overly permissive. A production deployment should scope resources to specific ARNs. This is acceptable for a tutorial but worth noting.
- The post mentions IRSA (IAM Roles for Service Accounts) in the summary as a best practice but doesn't demonstrate it. This is fine as a forward pointer but readers may want a follow-up guide.
- The Kubernetes secret example uses well-known AWS example credentials (`AKIAIOSFODNN7EXAMPLE`), which is correct for documentation purposes.

# Validation Summary: How to Configure Max Delivery Count in Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Dapr Resiliency API
- Azure Service Bus (Topics)
- AWS SNS/SQS
- Python / Flask (subscriber example)
- Kubernetes (kubectl apply)
- Dapr CLI

## Sources Consulted
- Dapr Azure Service Bus Topics component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr AWS SNS/SQS component reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr Resiliency overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Subscription schema reference — https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Pub/Sub API reference (publish endpoint and subscriber response statuses) — https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr Dead Letter Topics documentation — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr CLI reference for `dapr logs` — https://docs.dapr.io/reference/cli/dapr-logs/

## Issues Found
1. **`dapr logs --app-id order-processor` used in local/self-hosted context**: The `dapr logs` CLI command is Kubernetes-only and does not work in the local self-hosted scenario shown in the Testing section (where `dapr run` is used). In local mode, sidecar and app logs are printed directly to the terminal by `dapr run`. Replaced the `dapr logs` command with a comment directing the reader to observe logs in the `dapr run` terminal output.

## Review Notes
- The Subscription resource uses `apiVersion: dapr.io/v1alpha1`, which is deprecated in favor of `dapr.io/v2alpha1`. The v1alpha1 version still works and the field names used (`pubsubname`, `topic`, `route`, `deadLetterTopic`, `scopes`) are correct for that version. A future update could migrate to v2alpha1, which uses `routes` with rules-based routing instead of a single `route` field.
- The `X-Delivery-Count` header in the "Checking Delivery Count in the Event" section is presented as broker-specific. This is not a standard Dapr header — availability depends on the underlying broker. The post correctly qualifies this with "Some brokers expose the delivery count."
- The in-memory `attempt_counts` dictionary in the subscriber example is appropriate for demonstration but would not work in a production multi-instance deployment. This is expected for a tutorial.

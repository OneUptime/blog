# Validation Summary: How to Handle Dapr Pub/Sub Dead Letter Topics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, dead letter topics, resiliency API)
- Python (Flask)
- Node.js (Express)
- YAML (declarative subscriptions, resiliency configuration)
- Kubernetes (kubectl apply)
- CloudEvents

## Sources Consulted
- Dapr Dead Letter Topics documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Subscription Methods documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Resiliency Targets documentation: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Resiliency Policies documentation: https://docs.dapr.io/operations/resiliency/policies/
- Dapr How-to: Publish and Subscribe: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/

## Issues Found

1. **`DROP` status incorrectly described as forwarding to dead letter topic**: In the Python main subscriber code, the print statement said "Dropping to DLT" when returning `DROP` status. In Dapr, `DROP` discards the message entirely with a warning logged — it does NOT forward to the dead letter topic. Messages only reach the dead letter topic when `RETRY` attempts are exhausted. Changed comment to "Dropping message."

2. **Node.js `DROP` comment incorrect**: The Node.js example had a comment saying "Permanent failure - forward to dead letter" next to the `DROP` status response. This is incorrect for the same reason — `DROP` discards, it does not forward to the dead letter topic. Changed to "Permanent failure - discard message."

## Review Notes
- The post uses `apiVersion: dapr.io/v1alpha1` for the Subscription resource. Dapr also supports `v2alpha1` which adds routing rules via `routes` (with `default` and rule-based routing). The v1alpha1 format with `route` is still valid and simpler for basic use cases.
- The declarative subscription YAML correctly places `scopes` at the top level (not under `spec`), matching Dapr's resource schema.
- The Resiliency configuration is structurally correct. Worth noting: without a resiliency retry policy, failing messages go immediately to the dead letter topic on first failure (no retries). The post does show the resiliency config, but readers should be aware this is required for retry-before-dead-letter behavior.
- The `topic` field in CloudEvents delivered to the dead letter handler may contain the dead letter topic name rather than the original topic name, depending on the Dapr version. This is not explicitly documented but the behavior shown is reasonable for illustrative purposes.

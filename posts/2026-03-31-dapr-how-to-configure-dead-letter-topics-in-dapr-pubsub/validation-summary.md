# Validation Summary: How to Configure Dead Letter Topics in Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) — Pub/Sub building block
- Dapr Dead Letter Topics
- Dapr Resiliency policies
- Python (Flask)
- Node.js (Express)
- YAML declarative subscriptions (dapr.io/v2alpha1)

## Sources Consulted
- Dapr Dead Letter Topics documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Resiliency Targets documentation: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Resiliency Policies documentation: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Subscription spec reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Subscription methods documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/

## Issues Found
1. **Resiliency app target structure used incorrect `inbound` nesting.** The blog post had the resiliency target configured as `targets.apps.order-processor-service.inbound.retry`, but Dapr app targets use a flat structure (`targets.apps.order-processor-service.retry`). The `inbound`/`outbound` distinction is only used for component targets, not app targets. Fixed by removing the `inbound` nesting level.

## Review Notes
- The post correctly notes that dead letter topics should be paired with resiliency retry policies. The Dapr docs emphasize that without a retry policy, failing messages immediately go to the dead letter topic (no retries attempted), which the post alludes to but could state more explicitly.
- The declarative subscription uses `apiVersion: dapr.io/v2alpha1`, which is the current standard API version — correct.
- The `deadLetterTopic` field placement under `spec` (not under `spec.routes`) matches the official Dapr documentation examples.
- The Dapr publish API endpoint (`/v1.0/publish/pubsub/orders`) and 204 success status code are correct.
- All Python (Flask) and Node.js (Express) code examples are syntactically correct and use proper patterns for Dapr programmatic subscriptions and CloudEvent handling.

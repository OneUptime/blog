# Validation Summary: How to Use Dapr Pub/Sub as Serverless Event Source

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Dapr (pub/sub building block, state management, subscriptions)
- Apache Kafka (as pub/sub broker)
- KEDA (Kubernetes Event-Driven Autoscaling)
- Knative Eventing (Triggers, Brokers)
- Knative Serving
- Node.js / Express
- Python (requests library)
- Kubernetes

## Sources Consulted
- Dapr Component spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Apache Kafka pub/sub reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr State management API: https://docs.dapr.io/reference/api/state_api/
- Dapr Dead Letter Topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- KEDA ScaledObject spec: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA Apache Kafka scaler: https://keda.sh/docs/2.19/scalers/apache-kafka/
- Knative Eventing Triggers: https://knative.dev/docs/eventing/triggers/

## Issues Found
No technical issues found.

## Review Notes
- The Node.js consumer uses the built-in `fetch` API, which requires Node.js 18+. This is reasonable for a modern example but worth noting for readers on older Node.js versions.
- The KEDA ScaledObject uses `apiVersion: keda.sh/v1alpha1`, which is the current and correct version for KEDA v2.x.
- The Dapr Subscription CRD correctly uses `dapr.io/v2alpha1` (the newer version), while the Component CRD correctly uses `dapr.io/v1alpha1`.
- The Python publisher uses `data=json.dumps(order_data)` with an explicit Content-Type header, which works correctly. Using `json=order_data` would be more idiomatic with the requests library but is not incorrect.
- The Knative Eventing section is a standalone alternative approach rather than a direct Dapr integration, which is appropriate given the post's scope of covering serverless event source patterns.

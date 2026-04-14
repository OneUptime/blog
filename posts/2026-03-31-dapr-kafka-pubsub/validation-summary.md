# Validation Summary: How to Configure Dapr with Apache Kafka Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka (version 3.6.0)
- Dapr (pub/sub component)
- Strimzi Kafka Operator (Kubernetes-native)
- Kubernetes
- JavaScript / Node.js (Dapr SDK and Express.js)

## Sources Consulted
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr pub/sub API specification: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr subscription spec: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Strimzi documentation: https://strimzi.io/docs/operators/latest/overview
- CloudEvents specification: https://cloudevents.io/

## Issues Found
1. **CloudEvents envelope not accounted for in event handler**: The Express.js subscription handler accessed the order data directly via `req.body`, but Dapr delivers pub/sub messages wrapped in CloudEvents 1.0 format by default. The actual message payload is nested under `req.body.data`. Without this fix, `order.orderId` and `order.amount` would be `undefined`. Changed `const order = req.body;` to `const order = req.body.data;`.

## Review Notes
- The Strimzi Kafka deployment uses ZooKeeper mode. Newer Kafka versions (3.3+) support KRaft mode which eliminates the ZooKeeper dependency. Strimzi also supports KRaft. While the ZooKeeper-based setup is still valid and widely used, a future update could mention KRaft as an alternative.
- The Dapr subscription component uses the declarative YAML approach, which is one of three subscription methods (the others being programmatic and streaming). This is a reasonable default for a tutorial.
- All Dapr metadata field names, values, and API endpoints are correct for current Dapr versions.

# Validation Summary: How to Explain Dapr Pub/Sub in an Interview

## Status
validated

## Post Type
Interview preparation guide / Technical reference

## Technologies Covered
- Dapr (Distributed Application Runtime) pub/sub building block
- CloudEvents specification
- Express.js (Node.js subscriber example)
- Dapr JavaScript SDK (`@dapr/dapr`) for state management
- Message brokers (Kafka, Redis Streams, Azure Service Bus)

## Sources Consulted
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Pub/Sub Overview: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Dapr CloudEvents Documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Subscription Methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr JavaScript SDK State Management API
- CloudEvents Specification v1.0: https://github.com/cloudevents/spec/blob/v1.0/spec.md

## Issues Found

### 1. Incorrect 4xx status code handling in delivery semantics
- **What was wrong:** The post stated "If subscriber returns 4xx: message dropped (permanent failure)." In Dapr, only a 404 response specifically causes a message to be dropped. Other 4xx status codes (e.g., 400, 403) trigger retries, same as 5xx.
- **What was changed:** Updated "4xx" to "404" and clarified that other non-2xx codes (including 5xx) trigger retries. Also updated the summary section reference from "2xx/4xx/5xx" to "2xx/404/5xx".
- **Why:** Dapr's pub/sub API treats 404 as a special "drop" signal, while all other non-success status codes trigger retry behavior. Misrepresenting this could lead to incorrect error handling in subscriber implementations.

### 2. Incorrect Dapr JS SDK state.save() method signature
- **What was wrong:** The idempotency example used `daprClient.state.save('statestore', key, value)` with three separate arguments.
- **What was changed:** Updated to `daprClient.state.save('statestore', [{ key: key, value: value }])` which passes an array of state objects as the second argument.
- **Why:** The Dapr JavaScript SDK `state.save()` method signature is `save(storeName, stateObjects)` where `stateObjects` is an array of objects with `key` and `value` properties. The three-argument form shown in the original post does not match the SDK API.

## Review Notes
- The declarative subscription YAML uses `apiVersion: dapr.io/v1alpha1`. Dapr docs now also show `dapr.io/v2alpha1` with enhanced routing capabilities. The `v1alpha1` version is still supported and correct for basic subscriptions, but authors may want to mention `v2alpha1` as the newer option in future updates.
- The CloudEvents example includes `topic` and `pubsubname` fields listed alongside standard CloudEvents attributes. These are technically Dapr extension fields, not part of the core CloudEvents spec. This is not incorrect (they are present in the envelope), but could be clarified for precision.
- The competing consumers explanation is correct but broker-dependent. Not all Dapr pub/sub components support consumer groups equally (Kafka, Azure Service Bus Queues, RabbitMQ, and Redis Streams are confirmed supporters).
- The `state.get()` call in the idempotency example is correct per the JS SDK.

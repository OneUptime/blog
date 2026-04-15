# Validation Summary: How to Configure Pub/Sub Acknowledgment Modes in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub API
- RabbitMQ (pubsub.rabbitmq component)
- Apache Kafka (pubsub.kafka component)
- Go (subscriber code examples)
- RabbitMQ Management API
- Kafka consumer groups CLI

## Sources Consulted
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr RabbitMQ component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr Kafka component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- RabbitMQ Management HTTP API documentation
- Apache Kafka CLI tools documentation

## Issues Found

1. **RETRY handler used HTTP 500 instead of HTTP 200**: The `handleMessageWithRetry` function returned `w.WriteHeader(500)` with `{"status": "RETRY"}`. Per Dapr's pub/sub API, all three status values (`SUCCESS`, `RETRY`, `DROP`) should be returned with a 2xx HTTP status code. Dapr reads the `status` field from the JSON body only on 2xx responses. A non-2xx response (like 500) triggers a retry via a different mechanism (any non-2xx/non-404 causes retry regardless of body content), but the documented and correct approach is to use HTTP 200 with the `RETRY` status in the body. Fixed both the handler example and the async acknowledgment pattern example to use HTTP 200.

2. **`ackWaitTime` metadata field does not exist**: The RabbitMQ component configuration included `ackWaitTime: "60s"`, but this field does not exist in the official Dapr RabbitMQ pub/sub component documentation. Removed from the configuration example.

3. **`deleteOnError` metadata field does not exist**: The RabbitMQ component configuration included `deleteOnError: "false"`, but this field does not exist in the official Dapr RabbitMQ pub/sub component documentation. The closest real field is `deletedWhenUnused`, which controls auto-deletion of queues with no consumers — a different concept. Removed from the configuration example.

4. **Summary section referenced "500/RETRY"**: Updated to "200/RETRY" to match the corrected code examples, and removed the mention of `ackWaitTime` from the summary.

## Review Notes
- The `concurrencyMode` field is documented for the RabbitMQ component but is not listed in the Kafka component documentation. The blog post's "Controlling Concurrency Mode" section appears after the RabbitMQ section, so it reads as RabbitMQ-specific context, which is acceptable.
- The claim that Dapr commits Kafka offsets after successful subscriber acknowledgment is consistent with Dapr's at-least-once delivery semantics, though it is not explicitly stated in the Kafka component reference page.
- The Go code examples are syntactically correct and demonstrate valid patterns.
- The RabbitMQ management API endpoint and Kafka consumer-groups CLI command are both correct.

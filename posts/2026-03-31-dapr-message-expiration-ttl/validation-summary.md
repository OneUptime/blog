# Validation Summary: How to Implement Message Expiration with Dapr TTL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, message TTL)
- Python (httpx, FastAPI, datetime)
- Message brokers (Redis Streams, Kafka, RabbitMQ, Azure Service Bus, Google Cloud Pub/Sub)
- YAML (Dapr Subscription CRD)

## Sources Consulted
- Dapr pub/sub message TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-message-ttl/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr subscription methods documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Python datetime documentation (deprecation of utcnow): https://docs.python.org/3/library/datetime.html

## Issues Found

1. **`metadata.ttlInSeconds` passed as HTTP header instead of query parameter**: In both code examples (publish_price_update and publish_flash_sale_start), `metadata.ttlInSeconds` was incorrectly set as an HTTP header. Per the Dapr API reference, metadata must be passed as URL query parameters (e.g., `?metadata.ttlInSeconds=60`). Fixed both examples to use query parameters.

2. **Incorrect claim that the broker drops expired messages**: The post stated "Expired messages are dropped by the broker before delivery." For most pub/sub backends, the Dapr sidecar/runtime handles TTL — it checks message age upon receipt and discards expired messages before forwarding them to the application. Only backends with native TTL support (like Azure Service Bus) handle expiration at the broker level. Fixed the intro paragraph and summary to accurately describe Dapr runtime-level TTL handling.

3. **Misleading backend TTL support table**: The original table implied TTL support varies by backend and rated Google Cloud Pub/Sub as "Partial." In reality, all Dapr pub/sub components support TTL because the Dapr runtime handles the expiration logic. Rewrote the table to distinguish between Dapr runtime TTL (universal) and native broker TTL (only some backends).

4. **Deprecated `datetime.utcnow()` usage**: The first code example used `datetime.utcnow()`, which has been deprecated since Python 3.12. Changed to `datetime.now(timezone.utc)` for consistency with the rest of the post and modern Python best practices.

## Review Notes
- The Dapr Subscription YAML uses `apiVersion: dapr.io/v1alpha1` with the `route` field. While this still works, the newer `v2alpha1` API uses `routes.default` instead. Left as-is since v1alpha1 remains functional.
- The `deadLetterTopic` field name and placement under `spec` are correct.
- The application-level expiry check pattern is sound defensive programming advice.

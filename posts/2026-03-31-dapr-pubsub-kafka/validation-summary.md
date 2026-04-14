# Validation Summary: How to Set Up Dapr Pub/Sub with Apache Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka (with KRaft mode)
- Dapr pub/sub building block
- Dapr Kafka component (`pubsub.kafka`)
- Docker Compose
- Python (publisher and subscriber services)
- Flask (subscriber HTTP server)
- SASL authentication for Kafka

## Sources Consulted
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr pub/sub how-to guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Bitnami Kafka Docker image documentation

## Issues Found

1. **Deprecated `authRequired` field**: The basic Kafka component configuration used `authRequired: "false"`, which is deprecated in favor of `authType`. Changed to `authType: "none"`.

2. **Incorrect advanced config field name `fetchMin`**: The Dapr Kafka component uses `consumerFetchMin`, not `fetchMin`. Corrected the field name.

3. **Incorrect advanced config field name `fetchDefault`**: The Dapr Kafka component uses `consumerFetchDefault`, not `fetchDefault`. Corrected the field name.

4. **Non-existent field `rebalanceTimeout`**: This field does not exist in the Dapr Kafka component metadata spec. Removed from the advanced configuration example.

5. **Non-existent field `maxProcessingTime`**: This field does not exist in the Dapr Kafka component metadata spec. Removed from the advanced configuration example.

## Review Notes
- The `saslMechanism` value `"SHA-256"` in the Kubernetes SASL example is correct per Dapr's documentation (Dapr uses `SHA-256`, `SHA-512`, and `PLAINTEXT` rather than the full SCRAM prefix forms).
- The Docker Compose configuration for Kafka with KRaft mode using the Bitnami image is correct and functional.
- The publish API endpoint, programmatic subscription via `/dapr/subscribe`, and subscriber status responses (`SUCCESS`, `RETRY`, `DROP`) are all accurate.
- The partition key metadata query parameter `metadata.partitionKey` is correct per official Dapr documentation.
- The `json` import in `subscriber.py` is unused but harmless; not changed to preserve author style.

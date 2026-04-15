# Validation Summary: How to Configure Kafka Consumer Group Settings for Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Apache Kafka
- Dapr Kafka Pub/Sub Component (pubsub.kafka)
- IBM Sarama Go Kafka Client
- Kubernetes
- Go (for handler code example)

## Sources Consulted
- [Dapr Kafka Pub/Sub Component Reference](https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/) — official metadata field names, types, and defaults
- [Dapr Subscription Schema Reference](https://docs.dapr.io/reference/resource-specs/subscription-schema/) — confirmed v2alpha1 apiVersion and subscription spec format
- [Dapr components-contrib Kafka source (kafka.go)](https://github.com/dapr/components-contrib/blob/main/common/component/kafka/kafka.go) — confirmed IBM/sarama import, not Confluent
- [Dapr components-contrib Kafka metadata (metadata.go)](https://github.com/dapr/components-contrib/blob/main/common/component/kafka/metadata.go) — confirmed exact metadata field names: `consumerFetchMin`, `consumerFetchDefault`, `channelBufferSize`

## Issues Found

1. **Incorrect Kafka client library claim** (Overview section): The post stated Dapr's Kafka component "wraps Confluent's Go Kafka client." This is incorrect. Dapr uses the **IBM Sarama** Go Kafka client (a pure Go implementation), not the Confluent Go client (which depends on CGO/librdkafka). Fixed to "wraps the IBM Sarama Go Kafka client."

2. **Non-existent `rebalanceTimeout` metadata field** (Session and Heartbeat Timeouts section): The post included `rebalanceTimeout` as a Dapr Kafka metadata field. This field does not exist in the Dapr Kafka component documentation or source code. Removed the field from the YAML snippet.

3. **Incorrect fetch metadata field names** (Fetch Settings section): The post used `fetchMin` and `fetchDefault` as metadata field names. The correct Dapr metadata field names are `consumerFetchMin` and `consumerFetchDefault`, as confirmed in both the official documentation and the component source code. Fixed both field names.

## Review Notes
- The `channelBufferSize` default in Dapr is 256, while the post example uses 512. This is not an error (it's a tuning choice), but readers should be aware the default is 256.
- The Go handler code correctly handles the Dapr CloudEvent envelope structure and returns the expected `{"status": "SUCCESS"}` response.
- The declarative subscription uses the correct `dapr.io/v2alpha1` apiVersion.
- The Kafka monitoring command (`kafka-consumer-groups.sh`) is correct and standard.

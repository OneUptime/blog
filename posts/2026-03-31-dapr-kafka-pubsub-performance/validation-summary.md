# Validation Summary: How to Configure Apache Kafka for Optimal Dapr Pub/Sub Performance

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Apache Kafka (broker, CLI tools)
- Dapr pub/sub component (pubsub.kafka)
- Kubernetes (Deployments, Dapr annotations)
- Prometheus (alerting rules)

## Sources Consulted
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Apache Kafka CLI documentation (kafka-topics.sh, kafka-consumer-groups.sh): https://kafka.apache.org/documentation/
- Confluent Kafka CLI reference: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html

## Issues Found

1. **`producerMaxMessageBytes` is not a valid Dapr Kafka metadata field (line 87).** This field does not exist in the Dapr Kafka component. The correct field for controlling message size is `maxMessageBytes`, which applies to both producers and consumers. Replaced with `maxMessageBytes`.

2. **`producerFetchMin` is not a valid Dapr Kafka metadata field (line 89).** "Fetch" is a consumer-side concept, not a producer concept. The actual Dapr field is `consumerFetchMin`. Replaced with `consumerFetchMin`.

3. **`ackWaitTime` is not a valid Dapr Kafka metadata field (line 91).** This field does not exist in the Dapr Kafka pub/sub component. Dapr handles message acknowledgments via HTTP response codes from the application, not through a component-level timeout setting. Removed and replaced with the valid `compression` field.

4. **`requiredAcks` is not a valid Dapr Kafka metadata field (line 93).** Neither `requiredAcks` nor the values `WaitForAll`/`WaitForLocal` exist in the Dapr Kafka component specification. The Dapr Kafka component does not expose low-level Kafka producer ack settings. Removed the field and accompanying explanatory text.

5. **`producerCompressionCodec` is not a valid Dapr Kafka metadata field (line 135).** The correct field name is `compression`, which accepts values: `none`, `gzip`, `snappy`, `lz4`, `zstd`. Replaced with `compression`.

## Review Notes
- The base Dapr Kafka component configuration (brokers, authType, initialOffset, consumeRetryInterval, heartbeatInterval, sessionTimeout, maxMessageBytes, version) is correct.
- All Kafka CLI commands (kafka-topics.sh, kafka-consumer-groups.sh) use correct flags and syntax.
- The Kubernetes Deployment with Dapr annotations is correct.
- The Prometheus alerting rule is syntactically valid. The metric name `kafka_consumer_group_lag` is a common convention from Kafka exporters but may vary depending on the specific exporter used.
- The Dapr Kafka component does not expose many low-level Kafka producer tuning knobs directly. Applications requiring fine-grained producer control may need to use the Kafka client SDK directly alongside Dapr.
- The `sessionTimeout` value of 90000ms (90s) is unusually high compared to the default of 10s. While valid, this could mask consumer failures. The blog post doesn't explain the rationale for this value.

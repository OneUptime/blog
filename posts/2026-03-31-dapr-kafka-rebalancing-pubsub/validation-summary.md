# Validation Summary: How to Handle Kafka Rebalancing with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka (consumer groups, rebalancing, partition assignment)
- Dapr pub/sub component (pubsub.kafka)
- Python Dapr SDK (dapr.ext.grpc)
- Redis (idempotency tracking)
- Prometheus (alerting)
- Kubernetes (deployment environment)

## Sources Consulted
- Dapr Kafka pubsub component source code (components-contrib repository, `common/component/kafka/metadata.go` and `kafka.go`)
- Dapr official documentation for Kafka pubsub component metadata fields (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/)
- Dapr Python SDK source code and official examples (`dapr/python-sdk` repository, `examples/pubsub-simple/subscriber.py`, `dapr/ext/grpc/__init__.py`)
- Apache Kafka documentation for consumer group rebalancing, static group membership, and partition assignment strategies
- Apache Kafka CLI tools documentation (`kafka-consumer-groups.sh`)

## Issues Found

### 1. Non-existent Dapr metadata fields: `rebalanceTimeout` and `maxProcessingTime`
**What was wrong:** The component configuration included `rebalanceTimeout` and `maxProcessingTime` metadata fields. Neither field exists in the Dapr Kafka pubsub component. While the underlying Sarama Go library supports equivalent settings (`Config.Consumer.Group.Rebalance.Timeout` and `Config.Consumer.MaxProcessingTime`), Dapr does not expose them as configurable metadata.
**What was changed:** Removed both fields from the component configuration YAML.

### 2. Non-existent Dapr metadata field: `groupInstanceID`
**What was wrong:** The "Cooperative Sticky Rebalancing" section configured `groupInstanceID` for static group membership. This metadata field does not exist in the Dapr Kafka pubsub component. While Kafka supports `group.instance.id` (KIP-345) and Sarama supports `Config.Consumer.Group.InstanceId`, Dapr does not expose this setting.
**What was changed:** Replaced the entire section with documentation of `consumerGroupRebalanceStrategy` set to `"sticky"`, which IS a valid Dapr metadata field that minimizes partition movement during rebalances.

### 3. Section title and content mismatch: "Cooperative Sticky Rebalancing"
**What was wrong:** The section title said "Cooperative Sticky Rebalancing" but described static group membership via `groupInstanceID`. These are two distinct Kafka features: (1) the cooperative sticky assignor is a partition assignment strategy, and (2) static group membership prevents rebalances when consumers rejoin within the session timeout. The section conflated these concepts.
**What was changed:** Renamed section to "Sticky Rebalance Strategy" and rewrote content to accurately describe the sticky partition assignment strategy, which is what the `consumerGroupRebalanceStrategy: "sticky"` Dapr field actually configures.

### 4. Key settings list referenced non-existent field
**What was wrong:** The bullet list of key settings included `rebalanceTimeout` which does not exist in Dapr.
**What was changed:** Replaced with `consumerGroupRebalanceStrategy` and its valid values (`range`, `sticky`, `roundrobin`).

### 5. Summary referenced non-existent feature
**What was wrong:** The summary mentioned "cooperative sticky assignor" and "static group membership," neither of which was correctly configured.
**What was changed:** Updated to reference "sticky rebalance strategy" and "sticky partition assignor," matching the corrected configuration.

### 6. Python import used private module path
**What was wrong:** `from dapr.clients.grpc._response import TopicEventResponse` imports from a private (underscore-prefixed) module. While functional, this is not the public API.
**What was changed:** Consolidated to `from dapr.ext.grpc import App, TopicEventResponse`, which is the public API export.

## Review Notes
- The Prometheus alert rule uses `kafka_consumer_group_state{state="PreparingRebalance"}` which is not a standard metric from the commonly-used `danielqsj/kafka-exporter`. This metric would require a JMX exporter or custom exporter configuration. The alert syntax itself is valid Prometheus alerting YAML, but users should be aware they need an appropriate Kafka exporter that provides this metric.
- The `sessionTimeout` and `heartbeatInterval` values are passed as plain numbers ("30000", "3000") representing milliseconds. While this works due to backward compatibility handling in Dapr, the preferred format is Go duration strings (e.g., "30s", "3s").
- The Python idempotency pattern is correct but has a race condition window between the "check if processed" and "mark as processed" steps. For production use, a Redis SET with NX (set-if-not-exists) would be more robust. This is acceptable for a tutorial context.
- The `kafka-consumer-groups.sh --verbose` flag requires Kafka 2.3+. This is not noted in the post but is unlikely to be an issue for modern deployments.

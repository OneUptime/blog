# Validation Summary: How to Handle Kafka Topic Compaction

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Kafka
- Kafka log compaction
- Kafka topic configuration
- Kafka command-line tools
- Kafka Java Admin API
- Kafka Java Producer API
- JMX and Prometheus monitoring

## Sources Consulted
- Apache Kafka 4.1 Topic Configs: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka 4.1 Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka Design: Log Compaction: https://kafka.apache.org/43/design/design/#compaction
- Apache Kafka 4.1 Admin API Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/Admin.html
- Apache Kafka 4.1 AdminClient Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/admin/AdminClient.html
- Apache Kafka NewTopic Javadoc: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/admin/NewTopic.html
- Confluent Log and Network Metrics Reference: https://docs.confluent.io/platform/current/kafka/log-network-metrics.html
- Confluent Kafka CLI Tools Reference: https://docs.confluent.io/kafka/operations-tools/kafka-tools.html

## Issues Found
- The introduction and compaction overview overstated compaction as retaining only the latest value. Updated the wording to explain Kafka guarantees the latest value is retained, while older values are removed asynchronously by the log cleaner and may remain until cleaning runs.
- The `min.cleanable.dirty.ratio` explanation described the ratio as dirty-to-clean. Updated it to dirty-to-total log, matching Kafka's topic configuration documentation.
- The Java admin sample used `AdminClient` directly. Updated it to use the current `Admin` interface and `Admin.create(props)`, which Kafka's current Javadocs prefer.
- The monitoring section labeled `kafka-consumer-groups.sh --describe` as a compaction-lag check. Updated the label to consumer lag for applications reading compacted topics, because compaction progress is exposed through log cleaner metrics rather than consumer group lag.
- The troubleshooting snippet treated `log.cleaner.enable=true` as a normal current tuning step. Added a note that Kafka enables it by default and that the broker config is deprecated in Kafka 4.x and should not be disabled.
- The `compact,delete` alteration example used `kafka-topics.sh --alter --config`, while current Kafka guidance uses `kafka-configs.sh` for topic configuration changes. Replaced it with `kafka-configs.sh --alter --add-config` and bracketed the comma-separated `cleanup.policy` list value.
- The closing sentence called Kafka a queryable state store. Updated it to describe compacted topics as a durable source for reconstructing current state, which is technically more accurate.

## Review Notes
The remaining examples are syntactically plausible and align with Kafka's documented topic configs, broker log cleaner configs, tombstone behavior, Admin API, and JMX metric names. The Prometheus metric names depend on the JMX exporter rules in use, so they should be treated as examples rather than universal metric names.

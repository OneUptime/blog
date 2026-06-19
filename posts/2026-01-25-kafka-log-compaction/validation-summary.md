# Validation Summary: How to Keep Latest Values with Log Compaction in Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka log compaction
- Kafka topic configuration and CLI tools
- Spring Kafka `KafkaTemplate`
- Kafka Java consumer API
- Kafka Streams state stores and Processor API
- JMX monitoring

## Sources Consulted
- Apache Kafka 4.1 Topic Configs: https://kafka.apache.org/41/configuration/topic-configs/
- Apache Kafka 4.1 Design - Log Compaction: https://kafka.apache.org/41/design/design/#compaction
- Apache Kafka 4.1 Broker Configs: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka 4.1 Monitoring: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka Streams Javadocs / `KStream.processValues`: https://javadoc.io/doc/org.apache.kafka/kafka-streams/latest/org/apache/kafka/streams/kstream/KStream.html
- Apache Kafka Streams deprecation list: https://www.javadoc.io/doc/org.apache.kafka/kafka-streams/4.0.0/deprecated-list.html
- Spring Kafka Sending Messages: https://docs.spring.io/spring-kafka/reference/kafka/sending-messages.html
- Spring Kafka Tombstone Records: https://docs.spring.io/spring-kafka/reference/kafka/tombstones.html
- Confluent Kafka log/network metrics reference: https://docs.confluent.io/platform/current/kafka/log-network-metrics.html

## Issues Found
- The introduction said Kafka topics grow forever by default. Kafka's default `cleanup.policy` is `delete`, with default `retention.ms` of 7 days, so the wording was changed to time- or size-based delete retention by default.
- The log compaction description implied Kafka keeps only one latest value. Apache Kafka documents that compaction retains at least the latest value per key, so the wording was adjusted.
- The Mermaid diagram used subgraph names with spaces as identifiers. It was updated to use explicit identifiers and quoted labels.
- The `min.cleanable.dirty.ratio` explanation described the threshold as simply "50% duplicate keys." It was corrected to refer to the dirty ratio threshold.
- The Java consumer example omitted required deserializers and stopped after the first empty poll, which could return before reaching the topic end. It now sets key/value deserializers, assigns partitions, seeks to the beginning, reads to known end offsets, and handles empty partitions.
- The Kafka Streams example used deprecated `transformValues` / `ValueTransformerWithKey`. It now uses `processValues` with `FixedKeyProcessor`, the current replacement API.
- The cleaner tuning snippet mislabeled `log.cleaner.io.buffer.load.factor` as an I/O budget. The comment was corrected, and `log.cleaner.io.max.bytes.per.second` was added for I/O throttling.
- The `max.compaction.lag.ms` explanation said records older than 24 hours are compacted. Kafka only makes them eligible for compaction subject to cleaner availability, so the wording was corrected.
- The monitoring command was described as checking cleaner lag. `kafka-log-dirs.sh --describe` inspects log directory state, so the comment was corrected.
- The JMX metric examples used inaccurate Prometheus-style metric names. They were replaced with documented JMX MBeans for cleaner recopy, clean time, compaction delay, uncleanable partitions, and max dirty percentage.
- The gotcha for null keys said null-key messages are never compacted. Kafka treats missing keys for compacted topics as invalid, so the text and example were corrected to show rejection.

## Review Notes
The code snippets remain illustrative and omit surrounding imports, class definitions, and concrete serializers/deserializers. The `UserProfileDeserializer` name is a placeholder for the application's actual deserializer.

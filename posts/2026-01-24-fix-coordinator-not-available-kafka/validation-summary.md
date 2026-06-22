# Validation Summary: How to Fix 'Coordinator Not Available' Errors in Kafka

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Apache Kafka brokers and internal topics
- Kafka consumer groups and group coordinators
- Kafka transactional producers and transaction coordinators
- Kafka command-line tools
- Java Kafka clients
- Prometheus/JMX monitoring

## Sources Consulted
- Apache Kafka broker configuration documentation: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka monitoring documentation: https://kafka.apache.org/41/operations/monitoring/
- Apache Kafka ProducerConfig Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/ProducerConfig.html
- Apache Kafka ConsumerConfig Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerConfig.html
- Apache Kafka KafkaConsumer Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka ProducerFencedException Javadocs: https://kafka.apache.org/41/javadoc/org/apache/kafka/common/errors/ProducerFencedException.html
- Apache Kafka CoordinatorNotAvailableException Javadocs: https://kafka.apache.org/25/javadoc/index.html?org/apache/kafka/common/errors/CoordinatorNotAvailableException.html

## Issues Found
- The broker configuration example implied that `auto.create.topics.enable=true` is the key setting for coordinator internal topics. Replaced it with the relevant internal topic partition and replication settings so the example matches Kafka's documented `offsets.topic.*` and `transaction.state.log.*` configuration.
- The no-leader diagnosis comment used `leader=-1`, while `kafka-topics.sh --describe` output uses `Leader: -1`. Updated the text to match the command output.
- The under-replicated partition explanation was too broad. Clarified that under-replication is especially relevant to transactional producers when the transaction state log cannot meet its minimum ISR.
- The `nc` connectivity loop passed `host:port` as a single argument, which is not valid for standard netcat usage. Split the host and port before calling `nc -zv`.
- The `ResilientConsumer.reconnect()` example closed the consumer before reading its subscription. Stored the subscribed topics separately and reused that list during reconnect.
- The `transaction.state.log.min.isr` recovery snippet did not mention that this broker configuration is read-only at runtime. Updated the comment to state that broker restart is required.
- The Prometheus examples used exporter-specific metric names without explaining that Kafka officially documents JMX MBeans. Added a caveat and referenced the relevant Kafka JMX MBeans.

## Review Notes
The Java snippets use current Kafka client configuration constants and APIs. The Prometheus alert names remain examples because exact metric names vary by JMX exporter configuration.

# Validation Summary: How to Fix 'RebalanceInProgressException' in Kafka

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Apache Kafka
- Kafka Java consumer client
- Kafka consumer groups and rebalancing
- Kafka `kafka-consumer-groups.sh` CLI
- Confluent Kafka Python client
- librdkafka consumer configuration

## Sources Consulted
- Apache Kafka Consumer Configs: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka Basic Operations, Managing consumer groups: https://kafka.apache.org/41/operations/basic-kafka-operations/
- Apache Kafka `KafkaConsumer` Javadoc: https://kafka.apache.org/27/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Apache Kafka `ConsumerRebalanceListener` Javadoc: https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerRebalanceListener.html
- Apache Kafka `CooperativeStickyAssignor` Javadoc: https://kafka.apache.org/34/javadoc/org/apache/kafka/clients/consumer/CooperativeStickyAssignor.html
- Confluent Kafka Python API docs: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- librdkafka configuration reference: https://docs.confluent.io/platform/current/clients/librdkafka/html/md_CONFIGURATION.html

## Issues Found
- The `CooperativeConsumer` Java example used explicit `commitAsync()` calls without disabling Kafka's default automatic offset commits. Added `props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);` so the example is consistent with manual offset management.
- The `StaticMemberConsumer` Java example also used explicit `commitAsync()` calls without disabling automatic offset commits. Added `props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);`.
- The Python example checked confluent-kafka rebalance event codes using raw negative integers. Replaced those checks with the official `KafkaError._REVOKE_PARTITIONS` and `KafkaError._ASSIGN_PARTITIONS` constants and added the `KafkaError` import.

## Review Notes
- The local environment did not have `kafka-consumer-groups.sh` or `confluent_kafka` installed, so CLI and Python API details were verified against official Apache Kafka, Confluent, and librdkafka documentation.
- The Java examples are illustrative snippets and omit complete shutdown/wakeup handling, which would be useful in production code but is outside the scope of this post.

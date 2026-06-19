# Validation Summary: How to Fix 'DisconnectException' in Kafka

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java producer and consumer clients
- confluent-kafka-python
- librdkafka configuration
- Kafka broker configuration
- Kafka command-line tools
- Kubernetes command-line diagnostics

## Sources Consulted
- Apache Kafka producer configuration reference: https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka consumer configuration reference: https://kafka.apache.org/41/configuration/consumer-configs/
- Apache Kafka broker configuration reference: https://kafka.apache.org/41/configuration/broker-configs/
- Apache Kafka KRaft operations documentation: https://kafka.apache.org/41/operations/kraft/
- Apache Kafka KafkaProducer Javadoc: https://kafka.apache.org/10/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka KafkaConsumer Javadoc: https://kafka.apache.org/24/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html
- Confluent confluent-kafka-python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent librdkafka configuration reference: https://docs.confluent.io/platform/current/clients/librdkafka/html/md_CONFIGURATION.html

## Issues Found
- The controller diagnostic command used `kafka-metadata.sh` with a hard-coded metadata log file and `--command "cat -all"`. Current Kafka KRaft documentation uses `kafka-metadata-quorum.sh --bootstrap-server localhost:9092 describe --status` for runtime metadata quorum status, so the command was replaced.
- The Java producer retry example returned the `Future` from `producer.send(record)` immediately. Kafka documents `send()` as asynchronous, with send failures available through the returned `Future` or callback, so the surrounding retry logic would not catch most asynchronous disconnect failures. The example now calls `.get()`, returns `RecordMetadata`, handles `ExecutionException`, and retries recognized disconnect/timeout causes.

## Review Notes
The remaining Java, Python, and broker/client configuration examples use valid current Kafka or librdkafka property names. The explicit producer/consumer recreation examples are acceptable as troubleshooting patterns, but normal Kafka clients already perform internal broker reconnection controlled by reconnect backoff settings, so production code should avoid unnecessary client recreation unless the client has entered an unrecoverable application-level state.

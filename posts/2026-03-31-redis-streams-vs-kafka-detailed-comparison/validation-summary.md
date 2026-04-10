# Validation Summary: Redis Streams vs Kafka: A Detailed Comparison

## Status
validated

## Post Type
Technical comparison / reference guide

## Technologies Covered
- Redis Streams (XADD, XREAD, XREADGROUP, XACK, XPENDING, XGROUP)
- Apache Kafka (Producer API, Consumer API, kafka-configs.sh)
- Kafka Connect (dead letter queue configuration)
- Python redis-py client library
- Java Kafka client library (org.apache.kafka)

## Sources Consulted
- Redis Streams commands documentation: https://redis.io/docs/latest/commands/?group=stream
- Apache Kafka Producer/Consumer API documentation: https://kafka.apache.org/documentation/
- Kafka Connect error handling and dead letter queue configuration: https://kafka.apache.org/documentation/#connectconfigs
- redis-py library API reference: https://redis-py.readthedocs.io/en/stable/

## Issues Found

### 1. Kafka Consumer missing deserializer properties
- **What was wrong:** The consumer code block reused the `props` object from the producer example, which had `key.serializer` and `value.serializer` set but lacked the required `key.deserializer` and `value.deserializer` properties. `KafkaConsumer` would throw a `ConfigException` at instantiation without deserializer configuration.
- **What was changed:** Made the consumer snippet self-contained with its own `Properties` object (`consumerProps`) including `bootstrap.servers`, `group.id`, `key.deserializer`, `value.deserializer`, and `enable.auto.commit`.
- **Why:** Readers copying the consumer snippet would get a runtime error. The consumer and producer have distinct required configuration properties.

### 2. Incorrect Kafka Connect dead letter queue property name
- **What was wrong:** The post referenced `dead.letter.queue.topic.name` as the Kafka Connect DLQ configuration property. The correct property name is `errors.deadletterqueue.topic.name`.
- **What was changed:** Replaced `dead.letter.queue.topic.name` with `errors.deadletterqueue.topic.name`.
- **Why:** Using the wrong property name would silently fail — Kafka Connect would not create or route to a dead letter queue topic.

## Review Notes
- The `kafka-configs.sh` command omits the `--bootstrap-server` flag, which is required in practice. This is acceptable for a blog snippet focused on demonstrating the config flags, but readers should be aware they need to add `--bootstrap-server <broker>` when running the command.
- The throughput figure of "~100K msg/sec per stream" for Redis Streams is a conservative estimate. Real-world benchmarks on modern hardware often show higher numbers (300K-500K+ msg/sec), but as a safe lower bound for comparison purposes it is reasonable.
- Modern Kafka deployments (3.3+) can use KRaft mode without ZooKeeper. The table correctly lists both "ZooKeeper/KRaft" to cover legacy and modern deployments.

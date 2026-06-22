# Validation Summary: How to Fix 'InvalidTopicException' in Kafka

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Apache Kafka
- Kafka Java client APIs
- Kafka AdminClient
- Kafka command-line tools
- Java
- Bash
- GitHub Actions

## Sources Consulted
- Apache Kafka `InvalidTopicException` Javadoc: https://kafka.apache.org/38/javadoc/org/apache/kafka/common/errors/InvalidTopicException.html
- Apache Kafka `Topic` validation source: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/common/internals/Topic.java
- Apache Kafka `NewTopic` source: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/admin/NewTopic.java
- Apache Kafka `ProducerInterceptor` source: https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/clients/producer/ProducerInterceptor.java
- Apache Kafka Quickstart CLI examples: https://kafka.apache.org/quickstart/
- Apache Kafka broker/server configuration source: https://github.com/apache/kafka/blob/trunk/server-common/src/main/java/org/apache/kafka/server/config/ServerConfigs.java

## Issues Found
- The initial flowchart listed "Topic Already Exists" as an `InvalidTopicException` cause. Changed it to "Empty Name" because Kafka reports existing topics through topic-existence errors, while empty names are rejected by Kafka topic validation.
- The post implied all `__*` topics are rejected by Kafka's topic-name validator. Corrected this to explain that Kafka uses specific double-underscore internal topic names and that application `__*` names are a bad practice or platform-policy concern, not a universal `InvalidTopicException`.
- The nonexistent-topic scenario showed `InvalidTopicException` for `Topic user-events not found in metadata after 60000 ms`. Corrected it to `TimeoutException` and noted that nonexistent topics are related topic-management errors, commonly `TimeoutException` or `UnknownTopicOrPartitionException`.
- The internal-topic scenario showed a fabricated `InvalidTopicException` for the `__` prefix. Changed it to an authorization/policy-style error and adjusted the guidance to avoid internal-looking prefixes.
- Some `kafka-topics.sh --create` examples omitted `--bootstrap-server`. Added `--bootstrap-server localhost:9092` to align with current Kafka CLI usage.
- `TopicNameValidator.sanitize()` could return an invalid empty or reserved name after replacing/removing characters. Added a final validation check before returning.
- The `ProducerInterceptor` example threw an exception as if it blocked invalid sends. Kafka catches and logs exceptions thrown by producer interceptors, so the example now logs the detection and leaves blocking validation to normal send-time validation.
- Java snippets were missing imports or used an undefined/confusing `TopicConfig` helper type. Added missing imports and replaced the registry helper with a local `TopicDefinition` class.

## Review Notes
The corrected post is technically accurate for current Kafka client behavior. The examples are still illustrative and assume the reader supplies normal client properties such as serializers, deserializers, and reachable `bootstrap.servers`.

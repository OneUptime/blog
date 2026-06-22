# Validation Summary: How to Test Kafka Streams Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Kafka Streams
- TopologyTestDriver
- JUnit Jupiter
- AssertJ
- Testcontainers
- Maven
- Java

## Sources Consulted
- Apache Kafka 3.7 TopologyTestDriver Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/TopologyTestDriver.html
- Apache Kafka 3.7 TestInputTopic Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/TestInputTopic.html
- Apache Kafka 3.7 TestOutputTopic Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/TestOutputTopic.html
- Apache Kafka 3.7 TimeWindows Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/TimeWindows.html
- Apache Kafka 3.7 WindowedSerdes Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/WindowedSerdes.html
- Apache Kafka 3.7 WindowStore Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/state/WindowStore.html
- Apache Kafka 3.7 Branched Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/Branched.html
- Apache Kafka 3.7 KStream Javadocs: https://kafka.apache.org/37/javadoc/org/apache/kafka/streams/kstream/KStream.html
- Testcontainers Kafka module documentation: https://java.testcontainers.org/modules/kafka/
- Testcontainers JUnit 5 documentation: https://java.testcontainers.org/test_framework_integration/junit_5/
- Maven Central metadata for Testcontainers Kafka artifacts: https://central.sonatype.com/artifact/org.testcontainers/testcontainers-kafka

## Issues Found
- The Maven dependency snippet used the old `org.testcontainers:kafka` artifact and `org.testcontainers.containers.KafkaContainer` example. Current Testcontainers documentation uses `org.testcontainers:testcontainers-kafka` with `org.testcontainers.kafka.ConfluentKafkaContainer` for `confluentinc/cp-kafka` images. Updated the dependency and integration test imports/container class.
- The integration test used `@Container` without declaring the Testcontainers JUnit Jupiter extension dependency or class annotation. Added `testcontainers-junit-jupiter` and `@Testcontainers`, and removed the manual `@BeforeAll` container startup method so lifecycle handling is consistent with the extension.
- The examples use AssertJ `assertThat(...)`, but the dependency list did not include AssertJ. Added `org.assertj:assertj-core`.
- The windowed aggregation example referenced undefined `windowedSerde` and `windowedDeserializer` variables. Added a concrete `WindowedSerdes.timeWindowedSerdeFrom(...)` declaration and used its deserializer for the output topic.
- The description referred to "embedded Kafka" even though the integration section uses Testcontainers-managed Kafka. Updated the wording to match the implementation.

## Review Notes
The remaining snippets are intentionally abbreviated examples and assume standard Kafka Streams, Kafka client, JUnit, and AssertJ imports plus application-specific model classes and serializers where shown. The core testing approaches and Kafka Streams APIs are accurate for the versions discussed.

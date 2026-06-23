# Validation Summary: How to Configure Spring Boot with Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring for Apache Kafka
- Apache Kafka
- Jackson JSON serialization
- Lombok
- JUnit/Spring Boot integration testing

## Sources Consulted
- Spring Boot Apache Kafka Support: https://docs.spring.io/spring-boot/reference/messaging/kafka.html
- Spring Boot Common Application Properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring for Apache Kafka - Sending Messages: https://docs.spring.io/spring-kafka/reference/kafka/sending-messages.html
- Spring for Apache Kafka - @KafkaListener Annotation: https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages/listener-annotation.html
- Spring for Apache Kafka - Serialization, Deserialization, and Message Conversion: https://docs.spring.io/spring-kafka/reference/kafka/serdes.html
- Spring for Apache Kafka - Handling Exceptions: https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html
- Spring for Apache Kafka - Testing Applications: https://docs.spring.io/spring-kafka/reference/testing.html
- Spring for Apache Kafka API - KafkaHeaders: https://docs.spring.io/spring-kafka/docs/current/api/org/springframework/kafka/support/KafkaHeaders.html
- Spring for Apache Kafka API - JacksonJsonSerializer: https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/JacksonJsonSerializer.html
- Spring for Apache Kafka API - JacksonJsonDeserializer: https://docs.spring.io/spring-kafka/api/org/springframework/kafka/support/serializer/JacksonJsonDeserializer.html
- Apache Kafka Documentation: https://kafka.apache.org/documentation/
- Maven Central - Jackson Databind: https://central.sonatype.com/artifact/tools.jackson.core/jackson-databind

## Issues Found
- The dependency examples used `com.fasterxml.jackson.core:jackson-databind`, while the current Spring Kafka Jackson JSON serializers are based on Jackson 3. Updated the dependency examples to `tools.jackson.core:jackson-databind`.
- The examples used Lombok annotations but did not include Lombok dependencies. Added Lombok to both Maven and Gradle examples.
- The test example used `@EmbeddedKafka`, `@SpringBootTest`, JUnit, and AssertJ but did not include the required test dependencies. Added `spring-kafka-test` and `spring-boot-starter-test`.
- The JSON producer and consumer used `JsonSerializer` and `JsonDeserializer`, which are deprecated in current Spring Kafka 4 APIs. Updated the examples to `JacksonJsonSerializer` and `JacksonJsonDeserializer`.
- The JSON value deserializer called `setUseTypeMapperForKey(true)`, which configures key type headers and is not appropriate for a value deserializer. Removed that line.
- The integration test sent to `test-topic`, but the consumer listener was hard-coded to `my-topic`, and the test called `consumer.getLatch()` even though the consumer example did not provide a latch. Updated the listener topic to use `${app.kafka.topic:my-topic}`, added a `CountDownLatch` accessor, and set `app.kafka.topic=test-topic` in the test.
- The best-practice note said idempotent producers prevent duplicate messages generally. Narrowed the statement to duplicates caused by producer retries, which is the correct scope of producer idempotence.

## Review Notes
- The production YAML uses manual acknowledgment mode, but the basic listener example does not show an `Acknowledgment` parameter or explicit acknowledgment call. This is not incorrect because it is a separate production configuration snippet, but a future revision could add a manual acknowledgment example for completeness.
- The dead-letter-topic example is a method-level snippet and assumes the surrounding class imports `DeadLetterPublishingRecoverer`, `DefaultErrorHandler`, `FixedBackOff`, `TopicPartition`, `ConsumerFactory`, `KafkaTemplate`, and `ConcurrentKafkaListenerContainerFactory`.

# Validation Summary: How to Build Kafka Producers and Consumers with Spring Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring for Apache Kafka
- Apache Kafka producers and consumers
- JSON serialization and deserialization
- Kafka listener error handling
- Embedded Kafka testing

## Sources Consulted
- Spring for Apache Kafka Reference: Sending Messages - https://docs.spring.io/spring-kafka/reference/kafka/sending-messages.html
- Spring for Apache Kafka Reference: Serialization, Deserialization, and Message Conversion - https://docs.spring.io/spring-kafka/reference/kafka/serdes.html
- Spring for Apache Kafka Reference: @KafkaListener Annotation - https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages/listener-annotation.html
- Spring for Apache Kafka Reference: Handling Exceptions - https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html
- Spring for Apache Kafka Reference: Testing Applications - https://docs.spring.io/spring-kafka/reference/testing.html
- Spring for Apache Kafka Reference: Exactly Once Semantics - https://docs.spring.io/spring-kafka/reference/kafka/exactly-once.html
- Spring Boot Reference: Apache Kafka Support - https://docs.spring.io/spring-boot/reference/messaging/kafka.html
- Apache Kafka Producer Configs - https://kafka.apache.org/41/configuration/producer-configs/
- Apache Kafka Consumer Configs - https://kafka.apache.org/41/configuration/consumer-configs/

## Issues Found
- The dependency snippet used `spring-kafka` and `spring-kafka-test` directly for a Spring Boot application. Updated these to `spring-boot-starter-kafka` and `spring-boot-starter-kafka-test`, matching Spring Boot's Kafka testing guidance.
- The examples used `JsonSerializer` and `JsonDeserializer`, which are deprecated in current Spring Kafka 4.x in favor of `JacksonJsonSerializer` and `JacksonJsonDeserializer`. Updated YAML and Java snippets accordingly.
- The dead-letter-topic example marked `DeserializationException` as not retryable without configuring `ErrorHandlingDeserializer` or a dead-letter `KafkaTemplate` that can publish raw `byte[]` values. Removed that exception from the snippet to keep the example correct for listener-processing failures.
- The embedded Kafka test pinned the broker listener to `localhost:9092`, which risks port conflicts and is unnecessary because embedded broker addresses are exposed for Spring Boot tests. Removed the fixed broker listener property.
- The batch listener snippet said `setIdleBetweenPolls(0)` fetches up to 500 records per poll. That setting controls idle time between polls, not batch size. Updated the comment to point to `ConsumerConfig.MAX_POLL_RECORDS_CONFIG`, whose Kafka default is 500.
- The manual offset section claimed manual commits provide exactly-once semantics. Updated the wording to at-least-once processing with explicit offset control; Spring Kafka exactly-once semantics require transactions for read-process-write flows.

## Review Notes
The post omits imports and full model accessors for brevity, which is acceptable for a tutorial. The synchronous send example could also restore the interrupted thread status when catching `InterruptedException`, but the main API usage is otherwise correct.

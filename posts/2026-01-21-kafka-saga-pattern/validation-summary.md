# Validation Summary: How to Implement Saga Pattern with Kafka

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka
- Spring for Apache Kafka
- Jackson
- Saga pattern
- Java
- Python
- Confluent Kafka Python client

## Sources Consulted
- Apache Kafka `KafkaProducer` Javadoc: https://kafka.apache.org/10/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html
- Apache Kafka `ProducerRecord` Javadoc: https://kafka.apache.org/25/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html
- Spring for Apache Kafka `@KafkaListener` reference documentation: https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages/listener-annotation.html
- Confluent Kafka Python client API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Confluent Kafka Python client producer guide: https://docs.confluent.io/kafka-clients/python/current/overview.html
- Microservices.io Saga pattern reference: https://microservices.io/patterns/data/saga.html
- Jackson `ObjectMapper` Javadoc: https://javadoc.io/doc/com.fasterxml.jackson.core/jackson-databind/latest/com/fasterxml/jackson/databind/ObjectMapper.html

## Issues Found
- The choreography Java example published multiple event types to shared topics while listeners deserialized each message as one specific event type. Updated the example to use event-specific topics (`order-created-events`, `payment-processed-events`, `payment-failed-events`, and `order-cancelled-events`) so each listener receives the payload shape it expects.
- The order service showed a payment failure handler but did not subscribe it to a Kafka topic. Added `@KafkaListener(topics = "payment-failed-events")` and deserialization from the message body.
- The Java examples called Jackson `ObjectMapper` serialization and deserialization methods without handling their checked exceptions. Added `throws Exception` to the sample methods that call `writeValueAsString()` or `readValue()`.
- The order service imported and declared a `KafkaConsumer` that was not used. Removed it from the sample to avoid implying a consumer is required when the code uses `@KafkaListener`.
- The orchestration Java example did not add successful steps to `completedSteps`, so compensation would have no completed steps to undo. Added the current step to `completedSteps` before advancing to the next step.
- The orchestration Java example reversed the persisted `completedSteps` list in place during compensation. Changed the loop to iterate backward without mutating the stored step order.
- The orchestration Java response handler assumed every response had a matching saga state. Added a null guard so duplicate or unknown responses do not cause a `NullPointerException`.

## Review Notes
The high-level Saga pattern explanation, the distinction between choreography and orchestration, Kafka producer usage, Spring Kafka listener usage, and Confluent Kafka Python producer calls are consistent with the consulted documentation. The examples remain illustrative and omit surrounding application wiring such as dependency injection, producer configuration, listener container configuration, domain model definitions, and persistent saga state storage.

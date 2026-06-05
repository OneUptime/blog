# Validation Summary: How to Trace Spring Kafka Producers and Consumers with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Java
- OpenTelemetry Spring Boot starter
- OpenTelemetry Kafka clients instrumentation
- Spring Boot
- Spring for Apache Kafka
- Apache Kafka producers and consumers
- Java distributed tracing

## Sources Consulted
- OpenTelemetry Spring Boot starter documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/
- OpenTelemetry Spring Boot starter out-of-the-box instrumentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry Kafka clients instrumentation Javadoc: https://javadoc.io/doc/io.opentelemetry.instrumentation/opentelemetry-kafka-clients-2.6/latest/
- Maven Central for `opentelemetry-spring-boot-starter` 2.28.1: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-spring-boot-starter
- Maven Central for `opentelemetry-kafka-clients-2.6` 2.28.1-alpha: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-kafka-clients-2.6
- Spring for Apache Kafka project/version information: https://spring.io/projects/spring-kafka
- Spring Kafka `DefaultKafkaProducerFactory` Javadoc: https://docs.spring.io/spring-kafka/docs/current/api/org/springframework/kafka/core/DefaultKafkaProducerFactory.html
- Spring Kafka `DefaultKafkaConsumerFactory` Javadoc: https://docs.spring.io/spring-kafka/docs/current/api/org/springframework/kafka/core/DefaultKafkaConsumerFactory.html
- Spring Kafka listener annotation documentation: https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages/listener-annotation.html
- Spring Kafka message listener container acknowledgment modes: https://docs.spring.io/spring-kafka/reference/kafka/receiving-messages/message-listener-container.html
- Spring Kafka serialization/deserialization documentation: https://docs.spring.io/spring-kafka/reference/kafka/serdes.html
- Spring Kafka exception handling and delivery attempt header documentation: https://docs.spring.io/spring-kafka/reference/kafka/annotation-error-handling.html

## Issues Found
- The dependency versions were outdated. Updated Spring Kafka from `3.1.2` to `3.3.15`, OpenTelemetry Spring Boot starter from `2.1.0-alpha` to `2.28.1`, and Kafka clients instrumentation from `2.1.0-alpha` to `2.28.1-alpha`.
- The Spring Kafka factory examples used non-existent `setProducerPostProcessor` and `setConsumerPostProcessor` methods. Replaced them with the documented `addPostProcessor` API.
- The JSON consumer configuration lacked trusted package settings. Added `spring.json.trusted.packages` in YAML and `JsonDeserializer.TRUSTED_PACKAGES` in Java configuration so `OrderEvent` can be deserialized reliably.
- The manual acknowledgment listener used the default listener container factory. Added a manual acknowledgment container factory with `AckMode.MANUAL_IMMEDIATE` and pointed the priority listener to it.
- The batch listener referenced a `batchFactory` that was not defined. Added a batch listener container factory with `setBatchListener(true)`.
- The retry example read a custom `retry-count` header that the snippet never populated, making the DLQ branch unreachable under the shown code. Updated it to use Spring Kafka's `KafkaHeaders.DELIVERY_ATTEMPT` and enabled `deliveryAttemptHeader` on a resilient listener container factory.
- Several custom span examples ended spans immediately after scheduling asynchronous Kafka sends, before the send callback completed. Moved span completion into the callback and retained synchronous exception handling.
- The examples injected `Tracer` directly without showing a `Tracer` bean. Updated the examples to inject the OpenTelemetry bean and obtain a tracer via `openTelemetry.getTracer(...)`.
- The consumer and aspect examples referenced `OrderEvent` and `OrderProcessingService` without imports. Added imports to make package usage consistent.

## Review Notes
- The post now uses current Spring Boot 3.x compatible Spring Kafka and OpenTelemetry instrumentation versions as of June 5, 2026. Spring Kafka 4.x is available for the Spring Boot 4.x generation, but the updated `3.3.15` line is the appropriate current line for Spring Boot 3.x projects.
- The examples still assume application domain classes such as `OrderEvent` and `OrderProcessingService` exist in the indicated packages.

# Validation Summary: How to Build Event-Driven Microservices with Spring Cloud Stream

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring Cloud Stream
- Spring Cloud Stream Kafka binder
- Apache Kafka
- Spring for Apache Kafka
- Spring Cloud Stream test binder
- Testcontainers
- Maven
- YAML configuration

## Sources Consulted
- Spring Cloud project documentation, release train compatibility and recommended BOM: https://spring.io/projects/spring-cloud/
- Spring Cloud supported versions: https://github.com/spring-cloud/spring-cloud-release/wiki/Supported-Versions
- Spring Cloud Stream binding names reference: https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/binding-names.html
- Spring Cloud Stream producing and consuming messages reference: https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/producing-and-consuming-messages.html
- Spring Cloud Stream event routing reference: https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/event-routing.html
- Spring Cloud Stream Kafka binder reference: https://docs.spring.io/spring-cloud-stream/docs/current/reference/html/spring-cloud-stream-binder-kafka.html
- Spring Cloud Stream Kafka DLQ reference: https://docs.spring.io/spring-cloud-stream/reference/kafka/kafka-binder/dlq.html
- Spring Cloud Stream test binder reference: https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/spring_integration_test_binder.html
- Spring for Apache Kafka `KafkaHeaders` API: https://docs.spring.io/spring-kafka/docs/current/api/org/springframework/kafka/support/KafkaHeaders.html
- Testcontainers Kafka module documentation: https://java.testcontainers.org/modules/kafka/

## Issues Found
- The Spring Cloud BOM used `2023.0.0`, which is no longer an OSS-supported release train as of the 2026-06-15 review date. Updated it to the current Spring Cloud project example version, `2025.1.0`, and added a compatibility note that this release train targets Spring Boot 4.0.x.
- The event routing section described dynamic destination routing as "function composition." Spring Cloud Stream supports the shown `spring.cloud.stream.sendto.destination` header as dynamic output destination routing, so the wording was corrected.
- The test binder example used `@Import(TestChannelBinderConfiguration.class)` and did not include the required test binder dependency. Updated the example to add `spring-cloud-stream-test-binder` with test scope and use the current `@EnableTestBinder` approach from the official documentation.
- The test binder example autowired `OutputDestination` without using it. Removed it from the consumer-only test snippet.
- The Testcontainers Kafka example used the deprecated `org.testcontainers.containers.KafkaContainer` style with a Confluent image. Updated it to `org.testcontainers.kafka.ConfluentKafkaContainer`, which is the current Testcontainers API for `confluentinc/cp-kafka` images.

## Review Notes
The remaining examples are illustrative snippets and omit surrounding imports, repository fields, service definitions, serializers, and test setup that a full project would need. The Kafka DLQ example is correct for a grouped Kafka consumer, but production systems should also decide whether to customize DLQ naming, serializers, retention, and replay tooling.

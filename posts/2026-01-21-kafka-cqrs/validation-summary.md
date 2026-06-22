# Validation Summary: How to Build CQRS with Kafka

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Spring for Apache Kafka
- Spring Boot / Spring MVC
- Spring Data JPA
- Spring Data Elasticsearch
- PostgreSQL
- Elasticsearch
- Java
- Project Lombok
- CQRS and event-driven architecture

## Sources Consulted
- Spring for Apache Kafka serialization and deserialization documentation: https://docs.spring.io/spring-kafka/reference/kafka/serdes.html
- Spring for Apache Kafka `JsonDeserializer` API documentation: https://docs.spring.io/spring-kafka/docs/current/api/org/springframework/kafka/support/serializer/JsonDeserializer.html
- Spring for Apache Kafka `JacksonJsonSerializer` API documentation: https://docs.spring.io/spring-kafka/docs/current/api/org/springframework/kafka/support/serializer/JacksonJsonSerializer.html
- Spring for Apache Kafka `JacksonJsonDeserializer` API documentation: https://docs.spring.io/spring-kafka/docs/current/api/org/springframework/kafka/support/serializer/JacksonJsonDeserializer.html
- Apache Kafka producer configuration reference: https://kafka.apache.org/41/configuration/producer-configs/
- Spring Data Elasticsearch operations documentation: https://docs.spring.io/spring-data/elasticsearch/reference/elasticsearch/template.html
- Spring Data Elasticsearch `UpdateQuery.Builder` API documentation: https://docs.spring.io/spring-data/elasticsearch/reference/api/java/org/springframework/data/elasticsearch/core/query/UpdateQuery.Builder.html
- Spring Framework dependency injection documentation: https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html
- Project Lombok `@Value` documentation: https://projectlombok.org/features/Value

## Issues Found
- Several Spring components declared `final` dependency fields without constructors, so the Java snippets would not compile as shown. I added constructors to `OrderCommandController`, `OrderProjection`, `OrderSearchProjection`, and `OrderQueryController`.
- The Kafka configuration used Spring Kafka's `JsonSerializer`, `JsonDeserializer`, and `JsonDeserializer.TRUSTED_PACKAGES`. In current Spring Kafka 4.x these Jackson 2 classes are deprecated for removal in favor of the Jackson 3 `JacksonJsonSerializer` and `JacksonJsonDeserializer`. I updated the serializer, deserializer, and trusted-packages constant names accordingly.

## Review Notes
- The producer uses `acks=all` with idempotence enabled, which matches Kafka's requirements for idempotent producers. This improves producer-side duplicate handling but does not make the database write and Kafka publish atomic; production systems commonly use a transactional outbox or Kafka transactions coordinated with application state for that guarantee.
- `JacksonJsonDeserializer.TRUSTED_PACKAGES` is set to `*` for brevity. A production application should restrict trusted packages to the application's event package.
- The snippets assume supporting types and repository methods exist, such as `OrderRepository`, `OrderItem`, `CreateOrderRequest`, and `OrderSearchRepository.search(...)`.

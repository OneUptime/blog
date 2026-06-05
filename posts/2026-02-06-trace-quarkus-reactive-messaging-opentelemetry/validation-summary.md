# Validation Summary: How to Trace Quarkus Reactive Messaging with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Quarkus
- Quarkus Messaging / SmallRye Reactive Messaging
- OpenTelemetry tracing
- Apache Kafka
- JSON-B serialization
- Java
- JUnit / Quarkus tests

## Sources Consulted
- Quarkus OpenTelemetry guide, https://quarkus.io/guides/opentelemetry
- Quarkus OpenTelemetry tracing guide, https://quarkus.io/guides/opentelemetry-tracing
- Quarkus Messaging guide, https://quarkus.io/guides/messaging
- Quarkus Kafka reference guide, https://quarkus.io/guides/kafka
- Quarkus Messaging extension metadata, https://quarkus.io/extensions/io.quarkus/quarkus-messaging/
- Quarkus Messaging Kafka extension metadata, https://quarkus.io/extensions/io.quarkus/quarkus-messaging-kafka/
- SmallRye Reactive Messaging Kafka receiving records documentation, https://smallrye.io/smallrye-reactive-messaging/4.34.0/kafka/receiving-kafka-records/
- SmallRye Reactive Messaging testing documentation, https://smallrye.io/smallrye-reactive-messaging/4.29.0/concepts/testing/
- SmallRye Reactive Messaging method signatures documentation, https://smallrye.io/smallrye-reactive-messaging/smallrye-reactive-messaging/3.1/signatures/signatures.html
- SmallRye IncomingKafkaRecordMetadata API documentation, https://smallrye.io/smallrye-reactive-messaging/3.13.0/apidocs/io/smallrye/reactive/messaging/kafka/api/IncomingKafkaRecordMetadata.html

## Issues Found
- The dependency examples used older Quarkus messaging artifact IDs. Updated them to `quarkus-messaging`, `quarkus-messaging-kafka`, and `quarkus-messaging-amqp`, and added `quarkus-jsonb` for the JSON-B serializer/deserializer examples.
- The Kafka incoming config used the generic `JsonbDeserializer` directly. Replaced it with a typed `OrderEventDeserializer`, matching Quarkus' JSON-B deserialization guidance.
- The pipeline validation stage returned `message.nack(...)` from a method declared to return `Message<OrderEvent>`, which is a type error. Changed it to throw the validation exception so Reactive Messaging can nack the message through the normal failure path.
- The pipeline snippet used `Message.of(...)` for transformed messages, which drops incoming metadata and acknowledgement chaining. Changed those returns to `message.withPayload(...)`.
- The pipeline snippet referenced `CompletionStage` and `orderService` without declaring them. Added the missing import and injection.
- The dead letter / retry example assumed `message.nack(...)` would retry by itself and read a non-standard `retry-count` header. Added delayed retry topic configuration and changed the header lookup to SmallRye's `delayed-retry-count`.
- The dead letter example used `IncomingKafkaRecordMetadata` and `Optional` without imports. Added the missing imports.
- The batch processing example used an unsupported `@Incoming` method shape with `Multi<Message<OrderEvent>>` and subscribed manually. Replaced it with a Kafka batch consumer using `Message<List<OrderEvent>>` and added the required `batch=true` channel configuration.
- The test example used `OpenTelemetryExtension`, which does not match Quarkus' CDI exporter testing pattern, and omitted required test dependencies/imports. Replaced it with an `InMemorySpanExporter` CDI producer, added in-memory connector setup, and listed the test-scoped dependencies.

## Review Notes
The examples remain illustrative and still depend on application-specific domain classes and services such as `OrderEvent`, `OrderService`, and `BatchProcessingService`. The OpenTelemetry messaging instrumentation is enabled by default in current Quarkus when the OpenTelemetry extension is present, so the explicit `quarkus.otel.instrument.messaging=true` setting is valid but not strictly required.

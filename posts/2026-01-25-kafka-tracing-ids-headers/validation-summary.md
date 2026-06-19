# Validation Summary: How to Pass Tracing IDs in Kafka Headers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Kafka producers, consumers, headers, and Kafka Streams
- OpenTelemetry Java API and context propagation
- W3C Trace Context (`traceparent` and `tracestate`)
- OpenTelemetry Kafka client instrumentation
- Spring Boot 3, Spring Kafka, and Micrometer Tracing
- Java and Gradle configuration

## Sources Consulted
- Spring Kafka Message Headers: https://docs.spring.io/spring-kafka/reference/kafka/headers.html
- Apache Kafka `Headers` Javadoc: https://kafka.apache.org/31/javadoc/org/apache/kafka/common/header/Headers.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Context Propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Java Kafka clients instrumentation README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/kafka/kafka-clients/kafka-clients-2.6/library/README.md
- Maven Central metadata for `opentelemetry-kafka-clients-2.6`: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-kafka-clients-2.6
- Spring Kafka Micrometer Observation documentation: https://docs.spring.io/spring-kafka/reference/kafka/micrometer.html
- Spring Boot tracing documentation: https://docs.spring.io/spring-boot/reference/actuator/tracing.html
- Kafka Streams `Record` Javadoc: https://docs.confluent.io/platform/current/streams/javadocs/javadoc/org/apache/kafka/streams/processor/api/Record.html

## Issues Found
- The manual producer example used Brave-style APIs (`tracer.currentSpan()`, `TraceContext`, `traceIdString()`, `spanIdString()`) while the surrounding post discusses OpenTelemetry. Replaced it with OpenTelemetry Java APIs (`Span.current()`, `SpanContext`) and the configured `TextMapPropagator`.
- The original manual `traceparent` construction hard-coded sampled flags and used platform-default character encoding. Updated it to use `SpanContext` trace flags and `StandardCharsets.UTF_8`.
- The consumer examples attempted to put a non-OpenTelemetry `TraceContext` directly into `Context.current().with(...)`. Replaced this with OpenTelemetry propagator extraction and, for manual parsing, `SpanContext.createFromRemoteParent(...)` wrapped with `Span.wrap(...)`.
- The OpenTelemetry Kafka dependency used an outdated explicit version (`1.32.0`). Updated the Gradle snippet to use the current alpha instrumentation BOM and unversioned Kafka instrumentation dependency.
- The OpenTelemetry section was labeled as auto-instrumentation even though the example wraps clients with library instrumentation. Renamed it to OpenTelemetry Kafka Instrumentation.
- The wrapped producer bean returned `KafkaProducer<String, String>`, but `KafkaTelemetry.wrap(...)` returns the Kafka `Producer` interface. Changed the bean return type to `Producer<String, String>`.
- The missing-context example could set a null Kafka message key as an OpenTelemetry string attribute. Guarded that attribute so it is only set when the record key is non-null.
- The Kafka Streams example used the older `Transformer` API and the same invalid `TraceContext` pattern. Replaced it with the current Processor API, copied headers before mutation, used propagator extraction/injection, and forwarded a record with updated headers.

## Review Notes
- The Spring Kafka observation properties are technically valid for enabling Micrometer observation, assuming the application includes the needed Spring Boot Actuator and Micrometer Tracing/OpenTelemetry or Brave bridge dependencies.
- The code snippets still omit imports, constructors, and application-specific helper methods such as `handleOrder`, `handleEvent`, and `transformValue`, which is normal for blog snippets but should be supplied in a complete sample project.

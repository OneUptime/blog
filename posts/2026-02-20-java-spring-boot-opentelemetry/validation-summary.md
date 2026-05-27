# Validation Summary: How to Instrument Spring Boot Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- OpenTelemetry Java SDK
- OpenTelemetry Spring Boot starter
- OTLP exporter
- OpenTelemetry Collector
- Distributed tracing
- OpenTelemetry metrics
- Logback MDC trace correlation

## Sources Consulted
- OpenTelemetry Spring Boot starter getting started documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter SDK configuration documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Spring Boot starter out-of-the-box instrumentation documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java instrumentation ecosystem documentation: https://opentelemetry.io/docs/languages/java/instrumentation/

## Issues Found
- The Maven BOM version was outdated compared with current OpenTelemetry Spring Boot starter documentation. Updated `opentelemetry-instrumentation-bom` from `2.12.0` to `2.28.1`.
- The auto-instrumentation coverage diagram included libraries not documented as out-of-the-box Spring Boot starter instrumentation, including JPA, RabbitMQ, gRPC, and Log4j. Updated the diagram to list documented starter coverage: JDBC/R2DBC, Kafka, MongoDB, and Logback/MDC.
- A manual span comment said `span.end()` flushes the span to the exporter. Ending a span makes it available for processing and export; it does not itself guarantee an immediate flush. Updated the comment.
- The trace-flow diagram called an inbound server span a root span even though the request included a `traceparent` header, meaning it may be a child of a remote parent. Updated the note to "Start server span."
- The logging correlation snippet was labeled `logback-spring.xml` while the shown configuration is Spring Boot YAML. Updated the label to `application.yml`.

## Review Notes
The post is technically relevant and the remaining examples align with the OpenTelemetry Java API and Spring Boot starter configuration model. The Spring Boot starter has less out-of-the-box instrumentation than the OpenTelemetry Java agent; future revisions could mention that distinction explicitly, but the corrected tutorial is accurate for the starter path it demonstrates.

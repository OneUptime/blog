# Validation Summary: How to Instrument Spring Boot with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- OpenTelemetry Java agent
- OpenTelemetry Spring Boot starter
- OpenTelemetry Java API and SDK
- OTLP
- Jaeger
- Logback
- Docker Compose

## Sources Consulted
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Spring Boot starter getting started: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter SDK configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Spring Boot starter annotations: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/annotations/
- OpenTelemetry Java supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java logger MDC instrumentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/logger-mdc-instrumentation.md
- Maven Central, opentelemetry-spring-boot-starter: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-spring-boot-starter
- Jaeger getting started: https://www.jaegertracing.io/docs/1.76/getting-started/

## Issues Found
- The Java agent examples used `http://localhost:4317` without setting `otel.exporter.otlp.protocol=grpc`. OpenTelemetry Java agent 2.x defaults to OTLP HTTP/protobuf, so port 4317 requires explicit gRPC configuration. Added the system property and environment variable.
- The Spring Boot starter dependency example used the OpenTelemetry core BOM and pinned an old starter version. The official starter docs require `opentelemetry-instrumentation-bom` for version alignment. Replaced the BOM and removed the direct starter version.
- The `@WithSpan` examples did not include the required `spring-boot-starter-aop` dependency. Added it to the dependency snippet.
- The Spring `application.yml` example used a gRPC OTLP endpoint without setting the protocol. Added `protocol: grpc`.
- The manual span, annotation, and RestTemplate snippets referenced `List` and `Duration` without imports. Added the missing imports.
- The sampling YAML used `otel.traces.sampler.probability`, which is not the OpenTelemetry Java SDK configuration key. Replaced it with `otel.traces.sampler: parentbased_traceidratio` and `otel.traces.sampler.arg: 0.1`.
- The text claimed a simple ratio sampler could sample all errors plus a percentage of successes. That is not true for head sampling based on trace ID before the outcome is known. Reworded it to describe programmatic sampler configuration.
- The local testing Docker Compose snippet ran an OpenTelemetry Collector without showing a valid collector pipeline to export traces to Jaeger. Replaced it with a Jaeger all-in-one setup that accepts OTLP directly on ports 4317 and 4318.

## Review Notes
The post is technically relevant and suitable as a Spring Boot OpenTelemetry tutorial after the corrections. The code examples are illustrative and still assume application-specific domain classes such as `Order`, `OrderRequest`, and repository/client types exist.

# Validation Summary: How to Replace Datadog APM Libraries with OpenTelemetry SDKs in Java

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Java
- OpenTelemetry Java agent
- OpenTelemetry Java API and Metrics API
- OpenTelemetry Spring Boot starter
- Datadog Java APM agent and dd-trace-api
- DogStatsD
- Docker
- Kubernetes
- OTLP / OpenTelemetry Collector
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java API guide: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java agent annotations: https://opentelemetry.io/docs/zero-code/java/agent/annotations/
- OpenTelemetry Spring Boot starter: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/
- OpenTelemetry Spring Boot starter getting started: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter SDK configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Spring Boot starter out-of-the-box instrumentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Datadog Java tracer configuration: https://docs.datadoghq.com/tracing/trace_collection/library_config/java/
- Datadog Java custom instrumentation / OpenTracing setup: https://docs.datadoghq.com/tracing/trace_collection/custom_instrumentation/opentracing/java/
- OneUptime OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post described the OpenTelemetry Java agent as a drop-in replacement that instruments the same set of libraries as Datadog. I changed this to say it replaces the JVM startup agent and supports a broad set of popular libraries, because supported instrumentation differs between agents and should be checked per service.
- The Docker, Kubernetes, and environment variable examples used Collector port `4317` without setting `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`. Current OpenTelemetry Java agent 2.x defaults to `http/protobuf`, so I changed these examples to use `http/protobuf` explicitly with port `4318`.
- The OneUptime examples did not explicitly set the OTLP protocol. I added `http/protobuf` so the endpoint examples are unambiguous.
- The log injection mapping implied Datadog `DD_LOGS_INJECTION=true` has a universal automatic OpenTelemetry equivalent. I clarified that OpenTelemetry log correlation is automatic only for supported logging frameworks and still requires the application log pattern to include MDC fields.
- The metrics example comment implied all gauges use callback-style async observation. I clarified that synchronous gauges record values directly and asynchronous gauges use callbacks.
- The OpenTelemetry dependency versions were outdated relative to the current official documentation. I updated `opentelemetry-api` to `1.62.0` and OpenTelemetry instrumentation artifacts to `2.28.1`.

## Review Notes
The Spring Boot starter documentation recommends importing the `opentelemetry-instrumentation-bom` for dependency alignment. The post keeps the direct dependency version for brevity, which is workable for a focused example but could be improved in a future edit by showing BOM-based dependency management.

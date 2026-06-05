# Validation Summary: How to Enable OpenTelemetry Tracing in Quarkus Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Quarkus
- Java
- Jakarta REST
- Mutiny reactive programming
- Hibernate ORM with Panache
- JDBC datasource telemetry
- GraalVM native image
- JUnit 5 / Quarkus tests

## Sources Consulted
- Quarkus OpenTelemetry guide: https://quarkus.io/guides/opentelemetry
- Quarkus OpenTelemetry Tracing guide: https://quarkus.io/guides/opentelemetry-tracing
- Quarkus Datasource guide, datasource tracing: https://quarkus.io/guides/datasource
- Quarkus Context Propagation guide: https://quarkus.io/guides/context-propagation
- Quarkus duplicated context / OpenTelemetry propagation guide: https://quarkus.io/guides/duplicated-context
- OpenTelemetry Java SDK testing documentation: https://opentelemetry.io/docs/languages/java/sdk/

## Issues Found
- Replaced the older RESTEasy Reactive artifact with `quarkus-rest`, matching current Quarkus REST guidance.
- Removed the standalone `opentelemetry-exporter-otlp` dependency from the main setup. Quarkus documents that `quarkus-opentelemetry` provides its own default CDI-wired OTLP exporters.
- Replaced legacy and incorrect OpenTelemetry properties with current `quarkus.otel.*` properties, including `quarkus.otel.enabled`, `quarkus.otel.exporter.otlp.endpoint`, `quarkus.otel.exporter.otlp.protocol`, and `quarkus.otel.sdk.disabled`.
- Removed the unsupported `quarkus.otel.service.name` setting and relied on `quarkus.application.name` / resource attributes for service identity.
- Corrected the database tracing section to state that JDBC tracing must be enabled with `quarkus.datasource.jdbc.telemetry=true`; it is not automatically enabled just by using Hibernate ORM.
- Updated native image guidance to avoid unnecessary OpenTelemetry SDK runtime-initialization build arguments and to note that the Quarkus extension supports native mode without the OpenTelemetry Java agent.
- Replaced the invalid `curl http://localhost:4318/v1/traces` verification step because OTLP trace receivers are ingest endpoints, not trace-query APIs.
- Adjusted the reactive `Multi` span-ending example so the stream span ends on completion and records failures instead of ending on each emitted item.
- Fixed the batch reactive example so child spans use a context containing the batch span as parent.
- Replaced the JUnit `OpenTelemetryExtension` example with Quarkus' documented CDI `InMemorySpanExporter` pattern and added the required `opentelemetry-sdk-testing` test dependency.
- Softened an absolute performance claim about native image startup time and memory footprint because those values are workload- and environment-dependent.

## Review Notes
- The snippets still use illustrative domain classes such as `Order`, `CreateOrderRequest`, and repository/client services that are not defined in the post. That is acceptable for a conceptual tutorial, but a future revision could link to a complete sample project.
- Quarkus also supports `@WithSpan` and `@AddingSpanAttributes` for method-level tracing, which could simplify some manual span code in a future update.

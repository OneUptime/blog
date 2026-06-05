# Validation Summary: How to Add OpenTelemetry Tracing to a Micronaut Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Micronaut Tracing
- Micronaut HTTP server and client instrumentation
- Micronaut Data / JDBC tracing
- Java
- Gradle
- Maven
- YAML configuration

## Sources Consulted
- Micronaut Tracing official guide: https://micronaut-projects.github.io/micronaut-tracing/latest/guide/
- Micronaut OpenTelemetry guide: https://guides.micronaut.io/latest/micronaut-cloud-trace-google-maven-groovy.html
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry context propagators specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- Micronaut AOP official guide: https://docs.micronaut.io/latest/guide/#aop

## Issues Found
- The setup used `opentelemetry-api` as a direct setup dependency but omitted `micronaut-tracing-opentelemetry-http`, which is required for Micronaut HTTP server/client span creation. Replaced the dependency in Gradle and Maven examples.
- The OpenTelemetry annotation dependency was shown as an implementation dependency. Updated it to an annotation processor, matching Micronaut Tracing guidance for OpenTelemetry annotations.
- The configuration snippets used non-current `tracing.*` / `opentelemetry.*` keys. Updated them to OpenTelemetry autoconfigure keys such as `otel.traces.exporter`, `otel.service.name`, `otel.exporter.otlp.endpoint`, `otel.traces.sampler`, and `otel.bsp.*`.
- The HTTP attribute examples used older semantic convention names. Updated them from `http.method`, `http.status_code`, and `http.url` to current names such as `http.request.method`, `http.response.status_code`, and `url.full`.
- The annotation example claimed private helper methods annotated with tracing annotations would create child spans. Updated the example to use `Span.current().setAttribute(...)` for private helper methods instead.
- The custom annotation example tagged whole `Product` objects with scalar-looking tag names. Removed misleading `@SpanTag` usage on object parameters.
- The database tracing section implied Micronaut Data automatically traces JDBC operations by itself. Updated the section to require `micronaut-tracing-opentelemetry-jdbc`, which instruments `DataSource` beans.
- Manual database span attributes used older database semantic convention names such as `db.system`, `db.operation`, `db.statement`, and `db.rows_returned`. Updated them to `db.system.name`, `db.operation.name`, `db.query.text`, and `db.response.returned_rows`.
- The production configuration used invalid/non-current sampler, batch processor, exporter, and span limit property names. Updated them to current OpenTelemetry Java SDK configuration keys.

## Review Notes
The examples remain illustrative and assume domain classes such as `Product`, `Price`, `Order`, and service clients exist in the application. No runnable Micronaut sample project was present, so validation focused on framework APIs, dependency names, configuration keys, and semantic conventions.

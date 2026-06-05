# Validation Summary: How to Bridge Micrometer Observations to OpenTelemetry Traces in Spring Boot 3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot 3.2
- Spring Boot Actuator
- Micrometer Observation
- Micrometer Tracing
- OpenTelemetry
- OTLP
- Prometheus metrics
- Java
- Maven
- Gradle

## Sources Consulted
- Spring Boot 3.2.0 Actuator Reference: https://docs.spring.io/spring-boot/docs/3.2.0/reference/html/actuator.html
- Spring Boot 3.2.0 Common Application Properties: https://docs.spring.io/spring-boot/docs/3.2.0/reference/html/application-properties.html
- Micrometer Observation Reference: https://docs.micrometer.io/micrometer/reference/observation.html
- Micrometer Observation Components Reference: https://docs.micrometer.io/micrometer/reference/observation/components.html
- Micrometer Observation Instrumenting Reference: https://docs.micrometer.io/micrometer/reference/observation/instrumenting.html
- Micrometer Observation Testing Reference: https://docs.micrometer.io/micrometer/reference/1.12/observation/testing.html
- Micrometer Observation Javadoc: https://www.javadoc.io/doc/io.micrometer/micrometer-observation/1.12.8/
- OpenTelemetry Java API Javadoc: https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-api/

## Issues Found
- The post said observations automatically generate structured logs. Updated this to clarify that observations generate metrics and traces through handlers and can provide correlated log context or structured logs when logging instrumentation is added.
- The Spring Boot YAML used non-Spring Boot `otel.*` exporter properties and the old Prometheus metrics property path. Updated the configuration to Spring Boot 3.2 `management.otlp.tracing.endpoint`, `management.opentelemetry.resource-attributes.*`, and `management.prometheus.metrics.export.enabled`.
- The dependency examples omitted `micrometer-observation-test` even though the testing section uses `TestObservationRegistry`. Added the test-scoped Maven and Gradle dependency.
- The manual parent observation example started an observation without opening a scope, so the nested observation would not reliably become a child span. Added `try (Observation.Scope scope = observation.openScope())`.
- Several Java snippets included package/import blocks but omitted required imports such as `BigDecimal`, `Instant`, `OpenTelemetry`, `Attributes`, and `AttributeKey`. Added the missing imports where needed.
- The custom convention usage example returned `void` while the MVC controller expected `processPayment` to return a transaction ID. Updated the example to return `String`.
- The logging observation handler attempted to subtract an unset context value from `System.currentTimeMillis()`. Added `startTime` storage in `onStart` and safe duration calculation in `onStop`.
- The observation predicate examples assigned `context.getLowCardinalityKeyValue(...)` to `String`, but Micrometer returns `KeyValue`. Updated the code to use `KeyValue#getValue()`.
- The direct OpenTelemetry example injected an OpenTelemetry `Tracer` directly and never used the field. Updated it to inject Spring Boot's `OpenTelemetry` bean and obtain a named tracer from it.

## Review Notes
The post remains version-specific to Spring Boot 3.2. Later Spring Boot releases add newer OpenTelemetry starter and exporter properties, but the corrected snippets are aligned with the Spring Boot 3.2.0 documentation used by the post.

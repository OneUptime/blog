# Validation Summary: How to Migrate from Micrometer Tracing to OpenTelemetry in Spring Boot

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Spring Boot
- Spring Boot Actuator tracing
- Micrometer Tracing
- OpenTelemetry Java API and SDK autoconfiguration
- OpenTelemetry Spring Boot starter
- OTLP and Zipkin trace export
- Maven and Gradle dependency configuration
- Java and JUnit 5

## Sources Consulted
- OpenTelemetry Spring Boot starter documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/
- OpenTelemetry Spring Boot starter getting started and BOM guidance: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter SDK configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Spring Boot starter declarative configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/declarative-configuration/
- OpenTelemetry Java SDK configuration reference: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Spring Boot starter API extension documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/api/
- Spring Boot Actuator tracing documentation: https://docs.spring.io/spring-boot/reference/actuator/tracing.html
- Micrometer Tracing direct API documentation: https://docs.micrometer.io/tracing/reference/api.html

## Issues Found
- The OpenTelemetry Spring Boot starter dependency used an outdated alpha version. Updated the dependency guidance to import the current OpenTelemetry instrumentation BOM and omit stale per-dependency versions.
- The Gradle dependency example also used the outdated alpha starter and a stale Micrometer version. Updated it to use the OpenTelemetry instrumentation BOM and versionless managed dependencies.
- The Micrometer Zipkin configuration included obsolete `spring.zipkin.*` properties alongside current `management.zipkin.tracing.endpoint`. Removed the obsolete Spring Cloud Sleuth-era properties.
- The OpenTelemetry YAML used invalid sampler structure (`otel.traces.sampler.probability`). Replaced it with `otel.traces.sampler: parentbased_traceidratio` and `otel.traces.sampler.arg: 0.1`.
- The OpenTelemetry YAML used `otel.service.version`, which is not the standard Java autoconfigure property. Moved service version under resource attributes.
- The OpenTelemetry service example injected `Tracer` directly. Updated it to inject the `OpenTelemetry` Spring bean and obtain a tracer from it, matching the starter documentation.
- Several Java snippets were missing imports or helper methods needed to compile. Added missing `BigDecimal`, `OpenTelemetry`, `AttributeKey`, `HttpHeaders`, `Scope`, and `Span` imports where appropriate, and added simple helper method stubs.
- The baggage migration example used an outdated/less accurate `BaggageManager` pattern. Updated it to Micrometer's scoped baggage API.
- The JUnit example expected three spans even though the service example created only two. Updated the assertion and wired the `OpenTelemetryExtension` instance into the Spring test context.
- The custom aspect examples used `ProceedingJoinPoint.proceed()` without declaring `throws Throwable`, and had uninitialized `final Tracer` fields. Added constructors and `throws Throwable`.
- The side-by-side migration section implied dual tracing could be enabled generally. Added a caveat to keep it isolated to avoid duplicate exported spans.
- The performance section made overly absolute claims. Reworded it to describe possible overhead reduction and to recommend measuring before and after migration.

## Review Notes
The OpenTelemetry documentation currently recommends the Java agent as the default Spring Boot instrumentation option when broad out-of-the-box coverage is desired. The post remains valid as a starter/manual-instrumentation migration guide, but readers should choose between the Java agent and Spring Boot starter based on deployment constraints.

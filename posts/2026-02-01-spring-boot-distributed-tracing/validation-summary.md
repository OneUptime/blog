# Validation Summary: How to Implement Distributed Tracing in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Boot 3.x
- Micrometer Tracing (`micrometer-tracing-bridge-otel`, `micrometer-tracing-bridge-brave`)
- OpenTelemetry (OTLP exporter, OpenTelemetry SDK Sampler API)
- Zipkin (zipkin-reporter-brave, OpenZipkin Docker image)
- Jaeger (all-in-one Docker image, native OTLP support)
- W3C Trace Context propagation (`traceparent`, `tracestate`)
- Micrometer Observation (`@Observed`, `ObservedAspect`, `ObservationRegistry`)
- Spring Web (`RestTemplate`, `WebClient`, `RestTemplateBuilder`)
- datasource-micrometer-spring-boot (JDBC tracing)
- Maven and Gradle build configuration

## Sources Consulted
- Spring Boot reference documentation — Observability and Tracing: https://docs.spring.io/spring-boot/reference/actuator/tracing.html
- Micrometer Tracing reference documentation: https://docs.micrometer.io/tracing/reference/
- Micrometer Tracing API source (`Tracer`, `Span`, `Baggage`, `BaggageInScope`, `BaggageManager`): https://github.com/micrometer-metrics/tracing
- Micrometer Observation `@Observed` annotation: https://docs.micrometer.io/micrometer/reference/observation/annotations.html
- OpenTelemetry Java SDK `Sampler` / `SamplingResult` API: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace
- OpenTelemetry OTLP HTTP exporter spec (port 4318, path `/v1/traces`): https://opentelemetry.io/docs/specs/otlp/
- W3C Trace Context (`traceparent`/`tracestate`): https://www.w3.org/TR/trace-context/
- Zipkin v2 API (`/api/v2/spans`) and `openzipkin/zipkin` Docker image: https://zipkin.io/
- Jaeger all-in-one image and OTLP support (`-p 4317`, `-p 4318`, UI on 16686): https://www.jaegertracing.io/docs/latest/getting-started/
- `net.ttddyy.observation:datasource-micrometer-spring-boot` artifact on Maven Central
- `io.zipkin.reporter2:zipkin-reporter-brave` artifact on Maven Central

## Issues Found

1. **Deprecated `Tracer.createBaggage(name, value)` API in the `BaggageService` example.**
   - In current Micrometer Tracing, `BaggageManager.createBaggage(String, String)` is deprecated in favor of `createBaggageInScope(String, String)`, which returns a `BaggageInScope` resource that must be closed via try-with-resources. Calling the deprecated `createBaggage` without explicit scope management makes the behavior described in the comment ("propagated automatically") fragile.
   - Replaced the `setUserContext(...)` method with a `withUserContext(..., Supplier<T> work)` method that opens both baggage values inside a try-with-resources block, ensuring the baggage stays in scope for the duration of the downstream work and is properly closed afterwards.

2. **Deprecated `tracer.createBaggage(...)` in the final "Putting It All Together" controller example.**
   - Same root cause as above. Replaced with `try (BaggageInScope ignored = tracer.createBaggageInScope("customer.tier", request.getCustomerTier())) { ... }` so the baggage is correctly scoped to the request handling and propagated to `orderService.createOrder(request)`.

## Review Notes

- The post correctly states that Jaeger supports OTLP natively (true since Jaeger v1.35); the all-in-one image ports (4317 gRPC, 4318 HTTP, 16686 UI) are accurate.
- The `Tracer` / `Span` / `Tracer.SpanInScope` usage in the `OrderService` example follows the canonical Micrometer Tracing pattern (`tracer.nextSpan().name(...)` → `Span.start()` → `tracer.withSpan(...)` → try-with-resources → `span.end()` in finally).
- The custom `Sampler` example uses the OpenTelemetry SDK `Sampler` interface; this works because Spring Boot's `OpenTelemetryAutoConfiguration` will pick up a user-defined `Sampler` bean and use it when building the `SdkTracerProvider`, overriding the default `ParentBased` sampler driven by `management.tracing.sampling.probability`.
- The `@Observed` annotation's `lowCardinalityKeyValues` is a `String[]` of alternating key/value pairs — the example `{"payment.type", "credit_card"}` is correct usage.
- The `application.yml` keys (`management.tracing.sampling.probability`, `management.otlp.tracing.endpoint`, `management.zipkin.tracing.endpoint`, `management.tracing.baggage.remote-fields`, `management.tracing.baggage.correlation.fields`) all map to valid Spring Boot 3.x properties.
- The Zipkin v2 ingest path `/api/v2/spans` and the OpenZipkin Docker image are current.
- `datasource-micrometer-spring-boot` version `1.0.3` exists on Maven Central and is compatible with Spring Boot 3.x.
- Code samples omit `import` statements (e.g., `io.micrometer.tracing.Baggage`, `io.micrometer.tracing.BaggageInScope`, `io.micrometer.tracing.Span`, `io.micrometer.tracing.Tracer`, `io.micrometer.observation.annotation.Observed`). This is standard for blog post brevity but readers should be aware they need to add them.

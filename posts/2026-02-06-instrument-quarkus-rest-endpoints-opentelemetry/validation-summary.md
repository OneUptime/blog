# Validation Summary: How to Instrument Quarkus REST Endpoints with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Quarkus
- OpenTelemetry
- Jakarta REST / JAX-RS
- Java
- Mutiny
- MicroProfile REST Client
- JDBC tracing
- OTLP exporter configuration

## Sources Consulted
- Quarkus OpenTelemetry guide: https://quarkus.io/guides/opentelemetry
- Quarkus OpenTelemetry Tracing guide: https://quarkus.io/guides/opentelemetry-tracing
- Quarkus REST guide: https://quarkus.io/guides/rest
- Quarkus REST Client guide: https://quarkus.io/guides/rest-client
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry exception semantic conventions: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- SmallRye Mutiny Uni API: https://javadoc.io/static/io.smallrye.reactive/mutiny/3.1.0/io.smallrye.mutiny/io/smallrye/mutiny/Uni.html

## Issues Found
- The post claimed JDBC calls are automatically instrumented without qualification. Updated this to note that JDBC spans require JDBC datasource telemetry to be enabled with `quarkus.datasource.jdbc.telemetry=true`.
- The post used older HTTP semantic attribute names (`http.method`, `http.status_code`). Updated examples to use stable OpenTelemetry HTTP attributes (`http.request.method`, `http.response.status_code`) while keeping `http.route`.
- The REST endpoint comments implied path parameter values and request/response details are captured directly. Updated wording to route template and HTTP metadata to avoid high-cardinality or body-capture implications.
- The Mutiny custom span example started and ended a span around an asynchronous pipeline without making it current through the pipeline. Updated it to use Quarkus `MutinyTracingHelper.wrapWithSpan`, as recommended by Quarkus documentation.
- The advanced configuration used `quarkus.otel.instrument.rest-client`, which is not a current documented Quarkus property. Replaced it with documented instrumentation toggles: `quarkus.otel.instrument.rest`, `quarkus.otel.instrument.resteasy`, and `quarkus.otel.instrument.resteasy-client`.
- The advanced propagator example included `b3` without adding the required OpenTelemetry trace-propagators dependency. Updated the example to the default W3C `tracecontext,baggage` propagators.
- The test example used `OpenTelemetryExtension` directly and looked up attributes by string keys. Replaced it with Quarkus' documented CDI `InMemorySpanExporter` pattern and `AttributeKey.stringKey(...)` attribute access.
- Updated JAX-RS-layer wording to Jakarta REST-layer wording to match current Quarkus terminology.

## Review Notes
The examples remain illustrative and omit surrounding application classes such as service fields, DTOs, and REST client interfaces. Those omissions are acceptable for a blog tutorial, but a future revision could add a short note that the snippets assume those application-specific types already exist.

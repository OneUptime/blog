# Validation Summary: How to Migrate from OpenTracing to OpenTelemetry (Step by Step)

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenTelemetry
- OpenTracing
- Java OpenTelemetry API and SDK
- OpenTelemetry Java OpenTracing shim
- OpenTelemetry Python SDK
- OpenTelemetry Python OpenTracing shim
- OTLP gRPC exporter
- W3C Trace Context propagation
- B3 propagation
- OpenTelemetry Baggage

## Sources Consulted
- OpenTracing project homepage: https://opentracing.io/
- OpenTelemetry OpenTracing compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/opentracing/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- Maven Central entry for `io.opentelemetry:opentelemetry-opentracing-shim`: https://central.sonatype.com/artifact/io.opentelemetry/opentelemetry-opentracing-shim
- OpenTelemetry Python OpenTracing shim documentation: https://opentelemetry-python.readthedocs.io/en/stable/shim/opentracing_shim/opentracing_shim.html
- OpenTracing Python global tracer API source/package behavior: https://pypi.org/project/opentracing/

## Issues Found
- The Java dependency coordinates used the wrong group ID for the OpenTracing shim. Changed `io.opentelemetry.opentracing-shim:opentelemetry-opentracing-shim` to `io.opentelemetry:opentelemetry-opentracing-shim`, matching Maven Central.
- The Java setup referenced `OtlpGrpcSpanExporter` but did not list the required `opentelemetry-exporter-otlp` dependency. Added it to the Maven dependency comments.
- The Java setup built an `OpenTelemetrySdk` without registering it globally, while the later propagation example used `GlobalOpenTelemetry`. Changed the setup to configure W3C Trace Context plus W3C Baggage propagators and call `buildAndRegisterGlobal()`.
- The Java SDK builder defaults to no-op propagators when manually constructed, so the article's propagation example needed explicit propagator configuration. Added `ContextPropagators` with W3C Trace Context and Baggage in Step 2.
- The propagation explanation stated that OpenTelemetry defaults to W3C Trace Context propagation too broadly. Reworded it to tie W3C propagation to the explicitly configured propagators in the Java example.
- The B3 migration snippet showed `B3Propagator` without naming the required Java extension artifact or applying the composite propagator to the SDK. Added the dependency comment and an SDK builder example using `setPropagators(...)`.
- The Python shim example created a shim tracer but did not register it as the OpenTracing global tracer, which would leave existing `opentracing.global_tracer()` or `opentracing.tracer` usage on the default tracer. Added `opentracing.set_global_tracer(shim_tracer)`.
- The Java dependency versions were outdated relative to the current official OpenTelemetry Java release observed during review. Updated the Java dependency comments from `1.35.0` to `1.62.0`.

## Review Notes
The migration guidance, span lifecycle mapping, error recording pattern, baggage distinction, and span kind guidance are technically consistent with the OpenTelemetry specification and language documentation after the fixes above. The Java examples remain illustrative snippets rather than complete compilable classes; a future revision could add full imports around every standalone snippet if the blog wants copy-paste compilability.

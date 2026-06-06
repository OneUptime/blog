# Validation Summary: How to Use B3 Propagation for Backward Compatibility with Zipkin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK and propagation APIs
- OpenTelemetry B3 propagator
- Zipkin B3 propagation
- W3C Trace Context
- W3C Baggage
- Kubernetes environment variable configuration

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- Zipkin B3 propagation specification: https://github.com/openzipkin/b3-propagation
- OpenTelemetry Python B3 propagator source: https://github.com/open-telemetry/opentelemetry-python/tree/main/propagator/opentelemetry-propagator-b3
- OpenTelemetry Python composite propagator source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-api/src/opentelemetry/propagators/composite.py
- npm package for JavaScript B3 propagation: https://www.npmjs.com/package/@opentelemetry/propagator-b3

## Issues Found
- The Python examples imported `TraceContextTextMapPropagator` from an outdated path. Updated imports to `opentelemetry.trace.propagation.tracecontext`.
- Several Python snippets called `inject(headers)` without an active span, which would produce no trace headers. Added tracer provider setup and active spans where needed.
- The Python dict examples and test assertions used uppercase B3 header keys. OpenTelemetry Python's default setter injects lowercase keys such as `x-b3-traceid`, so the examples and assertions were updated.
- The composite propagator explanation stated that W3C headers always win if present. OpenTelemetry Python runs composite propagators in order and later propagators can override earlier extracted trace context, so the example order and explanation were updated to make `traceparent` win when both formats are present.
- The 64-bit B3 trace ID extraction snippet used `extract()` without configuring a B3 propagator. Added `set_global_textmap(B3MultiFormat())` before extraction.

## Review Notes
Validated representative Python snippets against current OpenTelemetry packages. B3 examples intentionally omit `X-B3-ParentSpanId` on OpenTelemetry injection, which is correct because the OpenTelemetry B3 requirements say not to propagate that header.

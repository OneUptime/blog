# Validation Summary: How to Create OpenTelemetry Context Propagators Custom

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry context propagation
- OpenTelemetry JavaScript API and Node SDK
- OpenTelemetry Python API
- W3C Trace Context and B3 propagation concepts
- TypeScript custom propagators
- Python custom propagators

## Sources Consulted
- OpenTelemetry specification: Propagators API: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry JavaScript propagation guide and custom propagator example: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/propagation.md
- OpenTelemetry JavaScript `TextMapPropagator` source: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/propagation/TextMapPropagator.ts
- OpenTelemetry JavaScript `Context` API source: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/context/types.ts
- OpenTelemetry Node SDK configuration documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry Python `TextMapPropagator` documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.textmap.html
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python TraceContext propagator implementation: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-api/src/opentelemetry/trace/propagation/tracecontext.py
- OpenTelemetry Python composite propagator documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.composite.html

## Issues Found
- The Python `TextMapPropagator` interface sample showed `fields` as a regular method returning `Sequence[str]`. In current OpenTelemetry Python it is an abstract property returning `set[str]`, so the sample was corrected.
- The TypeScript examples validated IDs only with regexes, which allowed all-zero trace IDs and span IDs. Updated examples to use OpenTelemetry's `isValidTraceId`, `isValidSpanId`, and `isSpanContextValid` helpers where appropriate.
- The Python custom propagator treated getter output as either a string or list. The current OpenTelemetry Python getter contract returns a list of values or `None`, so the example was adjusted to read the first returned value and validate the resulting `SpanContext`.
- The multi-header TypeScript example used a raw `Symbol` for an OpenTelemetry context key. It was changed to `createContextKey`, matching the public API.
- The priority composite propagator checked only for a non-zero trace ID. It now validates the full extracted span context.
- The legacy 64-bit trace ID section claimed truncating a 128-bit trace ID preserved uniqueness. That is not guaranteed; the text now says the conversion loses entropy, and extraction rejects all-zero legacy IDs.
- The Node SDK registration example relied on setting the global propagator separately while current Node SDK configuration supports `textMapPropagator` directly. The snippet now passes the selected propagator to the `NodeSDK` constructor.

## Review Notes
The examples are tutorial-grade and omit some production concerns, such as propagating `TraceState`, handling duplicate header values with explicit policy, and using environment-variable propagator configuration. Those are acceptable omissions for the post's stated scope.

# Validation Summary: How to Use Mock Span Exporters for Unit Testing OpenTelemetry in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry Node.js tracing SDK
- TypeScript
- Jest or Mocha-style unit tests
- Express
- Supertest
- HTTP and Express instrumentation

## Sources Consulted
- OpenTelemetry JavaScript `@opentelemetry/sdk-trace-base` documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-base.html
- OpenTelemetry JavaScript `InMemorySpanExporter` API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-node.InMemorySpanExporter.html
- OpenTelemetry JavaScript `NodeTracerProvider` API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.node.NodeTracerProvider.html
- OpenTelemetry JavaScript `ReadableSpan` API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.ReadableSpan.html
- OpenTelemetry JavaScript `TraceAPI` API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_api._opentelemetry_api.TraceAPI.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Trace SDK specification, Span Exporter interface: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/

## Issues Found
- The post incorrectly said the Node.js SDK does not ship with a built-in in-memory exporter. The OpenTelemetry JavaScript SDK documents `InMemorySpanExporter`, so the introduction now says the SDK includes it while still explaining why a custom mock exporter can be useful.
- The test helper used `provider.addSpanProcessor(...)`, which is not present in the current `NodeTracerProvider` API documentation. Updated the example to pass `spanProcessors` in the `NodeTracerProvider` constructor.
- The nested span test asserted against `childSpan.parentSpanId`, but current `ReadableSpan` exposes `parentSpanContext`. Updated the assertion to use `childSpan.parentSpanContext?.spanId`.
- The HTTP example implied Express requests would create spans without registering HTTP/Express instrumentation. Added `registerInstrumentations` with `HttpInstrumentation` and `ExpressInstrumentation`, and changed the Express import to occur after instrumentation registration so the module can be patched.
- The HTTP example asserted only the legacy `http.method` and `http.status_code` attributes. Updated assertions to prefer stable HTTP semantic convention attributes, `http.request.method` and `http.response.status_code`, while allowing the legacy names during migration.

## Review Notes
The custom exporter example is technically valid, but projects that only need a basic in-memory list of finished spans can use the SDK-provided `InMemorySpanExporter` directly. HTTP semantic convention output can vary during the OpenTelemetry migration period depending on instrumentation version and `OTEL_SEMCONV_STABILITY_OPT_IN`.

# Validation Summary: How to Trace Flight Search and Fare Calculation Across GDS Systems

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry tracing API
- OpenTelemetry metrics API
- OTLP gRPC trace exporter
- Node.js
- Global Distribution Systems (Amadeus, Sabre, Travelport)

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript API reference for TraceAPI: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_api._opentelemetry_api.TraceAPI.html
- OpenTelemetry JavaScript OTLP gRPC trace exporter documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry JavaScript Node SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry resource concepts documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/

## Issues Found
- The setup snippet imported `OTLPTraceExporter` from `@opentelemetry/exporter-otlp-grpc`, but current OpenTelemetry JavaScript documentation uses the trace-specific package `@opentelemetry/exporter-trace-otlp-grpc`. Updated the import.
- The setup snippet used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript examples use `resourceFromAttributes(...)`, so the snippet was updated to match the documented API.
- The resource attribute `deployment.environment` is deprecated in current OpenTelemetry semantic conventions and replaced by `deployment.environment.name`. Updated the attribute key.
- The GDS child-span helper used `trace.active()`, which is not part of the OpenTelemetry JavaScript TraceAPI. Active context comes from `context.active()`, and `trace.setSpan(context.active(), parentSpan)` is the documented pattern. Added the `context` import and corrected the call.

## Review Notes
The remaining snippets are illustrative and rely on application-specific helper functions such as `callGDSWithTimeout`, `normalizeGDSResponse`, `calculateTaxes`, and `convertCurrency`. The OpenTelemetry APIs shown for `startActiveSpan`, span attributes, events, status, exception recording, `metrics.getMeter`, histograms, and counters align with the current official documentation.

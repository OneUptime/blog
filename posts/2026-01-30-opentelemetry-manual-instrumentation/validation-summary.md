# Validation Summary: How to Implement OpenTelemetry Manual Instrumentation

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/sdk-metrics`)
- OpenTelemetry OTLP HTTP exporters (`@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-metrics-otlp-http`)
- OpenTelemetry Resources and Semantic Conventions (`@opentelemetry/resources`, `@opentelemetry/semantic-conventions`)
- Node.js / TypeScript
- W3C Trace Context propagation
- Express (used in one HTTP server example)

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JS Manual Instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JS API reference (`@opentelemetry/api`): https://open-telemetry.github.io/opentelemetry-js/
- `@opentelemetry/sdk-node` NodeSDK reference and source
- `@opentelemetry/sdk-metrics` (PeriodicExportingMetricReader API)
- OTLP/HTTP specification — default endpoint `http://localhost:4318` and signal paths `/v1/traces`, `/v1/metrics`
- OpenTelemetry Semantic Conventions registry: https://opentelemetry.io/docs/specs/semconv/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
No technical issues found.

The code examples are syntactically valid TypeScript and use correct OpenTelemetry JavaScript APIs:
- Package names and imports resolve correctly.
- `NodeSDK` is initialized with the valid `resource`, `traceExporter`, and `metricReader` options.
- `PeriodicExportingMetricReader` accepts `exporter` and `exportIntervalMillis`.
- Tracer/Span APIs (`startSpan`, `startActiveSpan`, `setAttribute(s)`, `addEvent`, `setStatus`, `recordException`, `end`) match the spec.
- `SpanKind` values (`INTERNAL`, `SERVER`, `CLIENT`, `PRODUCER`, `CONSUMER`) and `SpanStatusCode` values (`UNSET`, `OK`, `ERROR`) match the spec.
- Context propagation via `propagation.inject` / `propagation.extract` and `context.with(...)` follow recommended patterns.
- Metric instrument creation (`createCounter`, `createHistogram`, `createUpDownCounter`) is correct.
- OTLP/HTTP default endpoint and path conventions are correct.

## Review Notes
- The post uses `SemanticResourceAttributes` and `SemanticAttributes` from `@opentelemetry/semantic-conventions`. These constants still work, but in recent versions of that package (1.27+) the project has migrated toward individual `ATTR_*` constants (e.g., `ATTR_SERVICE_NAME`) and split incubating attributes into a sub-export. The shown style remains functional and is still commonly seen in production code, so no change was required.
- The `new Resource({...})` constructor is still exported and functional; newer code may prefer helpers like `resourceFromAttributes`, but this is a stylistic preference rather than a correctness issue.
- The "Losing Context in Callbacks" example is conservative: with the default `AsyncLocalStorageContextManager` (used by `NodeSDK` on modern Node.js), context can propagate through `setTimeout` automatically. The explicit `context.with(ctx, ...)` pattern shown is still the recommended defensive approach and works across all context-manager implementations, so the advice is sound.
- The note that `telemetry.ts` "must be imported FIRST" is accurate for auto-instrumentation; for purely manual instrumentation this is less critical, but it remains good practice to initialize the SDK before any instrumented code runs.

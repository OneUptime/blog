# Validation Summary: How to Create OpenTelemetry In-Memory Exporter

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry JavaScript / Node.js SDK
- TypeScript
- Jest testing patterns
- OpenTelemetry traces, metrics, and logs

## Sources Consulted
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript package type definitions for `@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-metrics`, `@opentelemetry/sdk-logs`, `@opentelemetry/resources`, and `@opentelemetry/semantic-conventions`
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Logs SDK specification: https://opentelemetry.io/docs/specs/otel/logs/sdk/
- npm package metadata for current OpenTelemetry JS packages: `@opentelemetry/sdk-trace-node@2.7.1`, `@opentelemetry/sdk-metrics@2.7.1`, `@opentelemetry/resources@2.7.1`, `@opentelemetry/sdk-logs@0.218.0`

## Issues Found
- The post used `new Resource(...)` from `@opentelemetry/resources`, but the OpenTelemetry JS SDK 2.x API no longer exports the `Resource` class constructor. Changed examples to use `resourceFromAttributes(...)`.
- The post used deprecated `SemanticResourceAttributes.SERVICE_NAME`. Changed examples to use `ATTR_SERVICE_NAME` from `@opentelemetry/semantic-conventions`.
- The trace examples used `provider.addSpanProcessor(...)`, which is no longer part of the current `NodeTracerProvider` API. Changed examples to pass `spanProcessors` in the provider constructor.
- Span hierarchy assertions used `parentSpanId`, but current readable spans expose `parentSpanContext?.spanId`. Updated parent-child span checks accordingly.
- The metrics section claimed there was no built-in in-memory metric solution and showed a custom `MetricReader` with an incorrect `collect()` return type. Replaced it with the built-in `InMemoryMetricExporter` and `PeriodicExportingMetricReader`.
- Histogram metric assertions accessed `.count` and `.sum` without narrowing the metric data union. Added a `DataPointType.HISTOGRAM` guard before reading histogram values.
- The logs section implemented a custom exporter even though the current logs SDK provides `InMemoryLogRecordExporter`. Replaced the custom exporter with the built-in exporter and updated calls to `getFinishedLogRecords()`.
- Log examples imported `SeverityNumber` from `@opentelemetry/sdk-logs`, but it is exported from `@opentelemetry/api-logs`. Updated imports and added `@opentelemetry/api-logs` to the installation command.
- `LoggerProvider` setup used `addLogRecordProcessor(...)`, which is not part of the current API. Changed examples to pass `processors` in the provider constructor.
- The integration fixture created a local `MeterProvider`, but the service used `metrics.getMeter(...)` from the global API. Updated the fixture to register the meter provider globally and disable trace/metrics globals during shutdown.

## Review Notes
Verified representative TypeScript snippets against the current OpenTelemetry packages with `tsc --noEmit --strict`. The post is now accurate for the current OpenTelemetry JavaScript 2.x SDK package surface as of 2026-06-11.

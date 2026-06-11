# Validation Summary: How to Build OpenTelemetry Metric Readers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry metrics
- `@opentelemetry/sdk-metrics`
- `@opentelemetry/sdk-node`
- OTLP HTTP metric exporter
- Prometheus exporter
- TypeScript
- Node.js

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry OTLP Metrics Exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry JavaScript metrics documentation: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/metrics.md
- OpenTelemetry JS SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript Node.js getting started documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- Current npm package TypeScript declarations for `@opentelemetry/sdk-metrics` 2.7.1, `@opentelemetry/sdk-node` 0.218.0, `@opentelemetry/exporter-metrics-otlp-http` 0.218.0, `@opentelemetry/exporter-prometheus` 0.218.0, and `@opentelemetry/resources` 2.7.1.

## Issues Found
- Replaced deprecated/removed `new Resource(...)` usage with `resourceFromAttributes(...)`, matching OpenTelemetry JS SDK 2.x resource APIs.
- Replaced deprecated `NodeSDK` `metricReader` configuration with `metricReaders: [...]`.
- Corrected custom reader examples to use `PushMetricExporter` and callback-based `export(metrics, callback)` instead of awaiting `export(...)` as if it returned an `ExportResult`.
- Removed non-existent `Aggregation.Default()` usage and configured cumulative temporality through the `MetricReader` constructor.
- Corrected threshold-reader metric traversal and value handling by checking `DataPointType.SUM` and `DataPointType.GAUGE` before treating data point values as numbers.
- Replaced the `PeriodicExportingMetricReader` subclassing example that overrode a non-public `doExport()` method with an exporter wrapper that instruments export duration.
- Fixed retrying, instrumented, and circuit-breaker exporter wrappers to implement the current `PushMetricExporter` interface and preserve aggregation temporality/aggregation selector behavior.
- Fixed the buffering example so it does not override `collect()` with an incompatible return type, stores `flushIntervalMs`, uses callback-based export, and implements shutdown/flush behavior.
- Updated tests to construct `InMemoryMetricExporter` with an explicit `AggregationTemporality`, use `provider.getMeter(...)` instead of resetting the global meter provider per test, and import/configure `PeriodicExportingMetricReader` correctly in the integration test.
- Softened the export-timeout explanation and delta-temporality wording to avoid overstating abort behavior or implying every instrument kind is exported as delta.

## Review Notes
Representative TypeScript snippets were type-checked against the current OpenTelemetry packages in a temporary workspace under `.review-tmp/otelcheck` using `npx tsc --noEmit`.

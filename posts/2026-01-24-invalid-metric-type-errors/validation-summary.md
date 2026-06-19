# Validation Summary: How to Fix 'Invalid Metric Type' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry JavaScript API and SDK
- OTLP HTTP metrics exporter
- Prometheus exporter and metric mapping
- TypeScript
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry OTLP metrics exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry JavaScript metrics SDK package declarations and README for @opentelemetry/sdk-metrics 2.8.0: https://www.npmjs.com/package/@opentelemetry/sdk-metrics
- OpenTelemetry JavaScript OTLP HTTP metrics exporter package declarations and README for @opentelemetry/exporter-metrics-otlp-http 0.219.0: https://www.npmjs.com/package/@opentelemetry/exporter-metrics-otlp-http
- OpenTelemetry JavaScript API package declarations for @opentelemetry/api 1.9.1: https://www.npmjs.com/package/@opentelemetry/api
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The OTLP temporality examples imported `AggregationTemporality` from `@opentelemetry/sdk-metrics` for the exporter `temporalityPreference`. Updated them to use `AggregationTemporalityPreference` from `@opentelemetry/exporter-metrics-otlp-http`, which is the current exporter option enum.
- The histogram boundary examples used an unsupported top-level `boundaries` option on `meter.createHistogram`. Updated them to use `advice.explicitBucketBoundaries`, matching the OpenTelemetry JS API.
- The histogram section implied current JavaScript SDKs always throw on unsorted or duplicate explicit bucket boundaries. Adjusted the wording to describe invalid or misleading bucket layouts and to recommend sorted, unique boundaries without overstating runtime behavior.
- The view examples used `View` and `Aggregation` imports and `Aggregation.*()` calls that are not exported by the current `@opentelemetry/sdk-metrics` top-level API. Rewrote the examples to use current `MeterProvider` view option objects with `AggregationType`.
- The view conflict example claimed `Sum` aggregation is incompatible with Histogram instruments. Current OpenTelemetry JS supports configuring aggregations through view options and the spec describes aggregation customization as a valid use of views. Replaced this with an actual conflicting view-name scenario.
- The Prometheus counter error text attributed negative counter increments to Prometheus. Updated it to state that OpenTelemetry Counter instruments cannot record negative increments, while noting that counters export as monotonic sums/Prometheus counters.
- Removed unused imports from TypeScript snippets (`Counter`, `Histogram`, `UpDownCounter`, and `ValueType`) to keep the examples clean and syntactically current.

## Review Notes
The post is technically relevant and useful after correction. Some error messages remain illustrative rather than guaranteed exact output from every SDK or backend, but the surrounding guidance now matches the OpenTelemetry specifications and current OpenTelemetry JavaScript API shape.

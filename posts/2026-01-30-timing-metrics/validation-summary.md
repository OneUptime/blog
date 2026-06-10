# Validation Summary: How to Create Timing Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/api`, `@opentelemetry/sdk-metrics`, `@opentelemetry/exporter-metrics-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`)
- Node.js (`process.hrtime.bigint()`)
- TypeScript
- Express.js middleware pattern
- Prometheus / PromQL (`histogram_quantile`, `rate`)
- OTLP/HTTP metrics export protocol
- Histogram metric instrument with explicit bucket boundaries
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry JS SDK metrics documentation: https://open-telemetry.github.io/opentelemetry-js/
- OpenTelemetry semantic conventions: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry specification — Metric Advisory Parameters (advice): https://opentelemetry.io/docs/specs/otel/metrics/api/#instrument-advisory-parameters
- Prometheus querying functions: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Node.js `process.hrtime.bigint()` reference: https://nodejs.org/api/process.html#processhrtimebigint
- OTLP/HTTP exporter package on npm: https://www.npmjs.com/package/@opentelemetry/exporter-metrics-otlp-http

## Issues Found
No technical issues found.

All code samples, API signatures, package names, and PromQL expressions are correct and functional:
- `MeterProvider` constructor + `addMetricReader()` works in current `@opentelemetry/sdk-metrics` versions.
- `createHistogram(..., { advice: { explicitBucketBoundaries: [...] } })` matches the stable OpenTelemetry metrics advice API.
- `OTLPMetricExporter` config (`url`, `headers`) matches the exporter's `OTLPExporterNodeConfigBase`.
- The Prometheus alert rule using `histogram_quantile(0.99, rate(<metric>_bucket[5m]))` is the standard pattern for p99 latency alerting.
- Bucket boundary recommendations are reasonable for the operation types listed.

## Review Notes
- **Legacy HTTP semantic conventions**: The post uses `http.method`, `http.route`, and `http.status_code`. The current OpenTelemetry stable HTTP semantic conventions (since v1.23) renamed these to `http.request.method` and `http.response.status_code` (`http.route` is unchanged). The legacy names still work and many backends continue to recognize them, so the code is not incorrect, but updating to the new names would future-proof it.
- **`SemanticResourceAttributes` deprecation**: This constant has been superseded by individual `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants in recent versions of `@opentelemetry/semantic-conventions`. The legacy import still resolves but emits deprecation warnings in newer versions.
- **`addMetricReader` vs constructor `readers`**: Newer `@opentelemetry/sdk-metrics` versions prefer passing `readers: [...]` directly to the `MeterProvider` constructor. The `addMetricReader` method shown in the post still exists in 1.x but has been deprecated in favor of the constructor option.
- **Precision note for `Number(bigint) / 1e9`**: For sub-second durations this is fine, but for very long durations (multiple hours) the precision loss could matter. Not relevant for the use cases shown.
- Percentile descriptions ("Half of requests faster than this") are a simplification — technically p50 means 50% of requests are at or below the value — but acceptable for an explanatory diagram.

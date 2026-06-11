# Validation Summary: How to Build Size Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry (JavaScript/Node.js SDK and Python SDK)
- Prometheus (exporter and PromQL)
- Express middleware (Node.js)
- FastAPI / Starlette middleware (Python)
- psutil (Python)
- Mermaid diagrams
- YAML (Prometheus alerting rules)

## Sources Consulted
- OpenTelemetry JS SDK metrics docs: https://opentelemetry.io/docs/languages/js/
- `@opentelemetry/sdk-metrics` npm package and source: https://www.npmjs.com/package/@opentelemetry/sdk-metrics
- OpenTelemetry JS v2.0.0 release notes (covers `addMetricReader` removal)
- `@opentelemetry/semantic-conventions` npm package and deprecation issue: https://github.com/open-telemetry/opentelemetry-js/issues/5025
- Prometheus query function docs: https://prometheus.io/docs/prometheus/latest/querying/functions/
- PromLabs guidance on gauge vs counter functions: https://promlabs.com/blog/2020/09/25/metric-types-in-prometheus-and-promql/
- OpenTelemetry Python API (`opentelemetry.metrics.Observation`, `create_observable_gauge`)
- psutil documentation for `Process.memory_info()`, `disk_partitions()`, `disk_usage()`
- Node.js `process.memoryUsage()` reference

## Issues Found

1. **`meterProvider.addMetricReader()` is no longer available** — In `@opentelemetry/sdk-metrics`, the `addMetricReader` instance method was deprecated and removed (gone entirely in v2.0). The current API requires passing readers via the constructor's `readers` option. Updated the Node.js setup snippet accordingly and removed the unused `PeriodicExportingMetricReader` import that was a side effect of the prior pattern.

2. **`SemanticResourceAttributes` is deprecated** — `SemanticResourceAttributes.SERVICE_NAME`/`SERVICE_VERSION` have been replaced by the flat `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION` named exports from `@opentelemetry/semantic-conventions`. Updated the import and resource attribute keys to the current API.

3. **`rate()` / `increase()` used on gauges in PromQL** — The `QueueBacklog` alert applied `increase(queue_size_bytes[1h])` and `rate(queue_size_bytes[5m])` to a metric registered as a gauge. These functions assume monotonically increasing counters and treat decreases as resets, which is incorrect for gauges. Swapped them to `delta()` and `deriv()`, which are the gauge-appropriate functions per the Prometheus docs.

4. **`rate(process_memory_bytes...)` in the query examples** — Same gauge-vs-counter problem. Updated the "memory usage trend" PromQL example to use `deriv()` since `process_memory_bytes` is a gauge.

## Review Notes
- The Node.js snippet still uses `new Resource({...})`. The newer `resourceFromAttributes({...})` helper is preferred in current OTel JS, but `new Resource()` remains valid for the 1.x/2.x line, so this was left as-is to avoid scope creep.
- The `chunks` array in the Express middleware accumulates buffers but never reads them back; harmless but slightly wasteful. Left untouched as it's not a correctness issue.
- The Python `psutil.disk_usage()` call can raise `OSError` (beyond `PermissionError`) for special pseudo-filesystems. The current try/except catches the most common case; it's not strictly wrong.
- The FastAPI middleware imports `time` but doesn't use it — cosmetic.
- The `humanizePercentage` template function correctly receives a 0–1 ratio from `(used/total) > 0.8`, so the annotation renders as expected.
- All Mermaid diagrams render valid syntax.
- Histogram bucket boundaries, `advice.explicitBucketBoundaries`, `createObservableGauge`, `addCallback`, and the OTLP exporter wiring all match current OpenTelemetry JS APIs.

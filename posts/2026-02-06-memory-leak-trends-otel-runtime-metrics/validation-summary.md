# Validation Summary: How to Detect Memory Leak Trends in Production Using OpenTelemetry Runtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry JavaScript metrics SDK
- OpenTelemetry Node.js runtime instrumentation
- OpenTelemetry Python metrics API
- Prometheus HTTP API
- PromQL alerting rules
- Node.js V8 heap snapshots

## Sources Consulted
- OpenTelemetry Node.js runtime instrumentation package README and published package source: https://www.npmjs.com/package/@opentelemetry/instrumentation-runtime-node
- OpenTelemetry semantic conventions for V8 JS runtime metrics: https://opentelemetry.io/docs/specs/semconv/runtime/v8js-metrics/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.9/querying/api/
- Node.js V8 API documentation for heap snapshots: https://nodejs.org/download/release/latest-jod/docs/api/v8.html

## Issues Found
- The Node.js runtime metric list used outdated or incorrect `process.runtime.nodejs.*` metric names. Updated the list to the current metrics emitted by `@opentelemetry/instrumentation-runtime-node`, including `v8js.memory.heap.*`, `nodejs.eventloop.*`, and `v8js.gc.duration`.
- The PromQL examples queried non-existent Node runtime metric names. Updated them to use the Prometheus-translated OpenTelemetry names such as `v8js_memory_heap_used_bytes` and `v8js_gc_duration_seconds_*`.
- The heap metric is emitted per V8 heap space. Updated PromQL examples and alert rules to aggregate with `sum without (v8js_heap_space_name)` before trend detection.
- The request-rate normalization could fail PromQL vector matching when `http_requests_total` carries labels such as route, method, or status. Updated the denominator to aggregate request rate to a scalar.
- The Python Prometheus script used `start="now()-24h"` and `end="now()"`, but the Prometheus range query API requires RFC3339 timestamps or Unix timestamps. Updated the script to calculate Unix start and end timestamps.
- The script checked RSS and `process_runtime_nodejs_gc_count_total`, but the Node.js runtime instrumentation does not emit those metrics directly. Removed the RSS check and changed GC frequency detection to use the Prometheus histogram count for `v8js.gc.duration`.
- The GC duration histogram is labeled by GC type. Updated GC rate and alert expressions to aggregate without `v8js_gc_type`.
- The alert thresholds treated `deriv()` as bytes per hour. PromQL `deriv()` returns change per second, so the 1 MiB/hour and 512 KiB/hour thresholds were converted to approximately `291` and `146` bytes per second.
- The Python GC callback assumed exactly three generations. Updated it to iterate over `gc.get_stats()` so it matches the runtime's reported generations.
- Removed an unused `sys` import from the Python runtime metrics example.

## Review Notes
- The Python runtime metrics example defines custom OpenTelemetry metrics; it still assumes the application has configured a real OpenTelemetry `MeterProvider` and exporter elsewhere.
- Prometheus metric names may differ if an OpenTelemetry-to-Prometheus pipeline disables underscore escaping or unit suffixes. The post now states the assumption used by the examples.

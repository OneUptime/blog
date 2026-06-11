# Validation Summary: How to Create Prometheus Exemplar Integration

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Prometheus (2.26+ with `--enable-feature=exemplar-storage`)
- OpenMetrics format
- OpenTelemetry (Go, Python, Node.js SDKs)
- Prometheus Go client library (`client_golang`)
- Python `prometheus_client`
- Node.js `prom-client`
- Grafana (7.4+) data source exemplar configuration
- Mermaid diagrams
- OneUptime (OTLP + Prometheus remote write)

## Sources Consulted
- Prometheus Go client docs — `prometheus.ExemplarObserver` interface and `ObserveWithExemplar(value, exemplar Labels)` signature: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Python `prometheus_client` histogram exemplar API (`observe(amount, exemplar={...})`): https://prometheus.github.io/client_python/instrumenting/histogram/
- `prom-client` repository and TypeScript definitions: https://github.com/siimon/prom-client and https://github.com/siimon/prom-client/blob/master/index.d.ts
- `prom-client` README exemplar documentation: https://github.com/siimon/prom-client/blob/master/README.md
- `prom-client` histogram source verifying the exemplar observe signature: https://github.com/siimon/prom-client/blob/master/lib/histogram.js
- OpenMetrics specification for exemplar exposition format

## Issues Found

1. **Node.js `observe()` call signature was incorrect.** The post used a three-positional-argument form `requestDuration.observe(labels, value, exemplarLabels)`. The `prom-client` library does not support this overload. When `enableExemplars: true` is set on a Histogram, the observe method is replaced with one that takes a single object: `{ labels, value, exemplarLabels }`. Fixed the example to use the object form.

2. **Node.js example was missing OpenMetrics content-type setup.** Per the `prom-client` documentation, exemplars are only rendered when the registry is set to the OpenMetrics content type. Without this, the `enableExemplars: true` option has no observable effect. Added `register.setContentType(Registry.OPENMETRICS_CONTENT_TYPE);` after registry construction.

## Review Notes

- The Go example is accurate: the `prometheus.ExemplarObserver` interface and `ObserveWithExemplar(value float64, exemplar Labels)` signature are correct, and the OpenTelemetry `span.SpanContext().HasTraceID()` / `TraceID().String()` calls are valid in the current OTel Go SDK.
- The Python example is accurate: `Histogram.observe(amount, exemplar={'trace_id': '...'})` matches the official `prometheus_client` API, and serving via `prometheus_client.openmetrics.exposition.generate_latest` is the correct way to expose exemplars.
- The OpenMetrics exemplar exposition example (`# {trace_id="..."} 0.095 1640000000.000`) matches the OpenMetrics spec format `<value> # {<exemplar-labels>} <exemplar-value> [<timestamp>]`.
- The Prometheus version requirement (2.26+) and `--enable-feature=exemplar-storage` flag are correct; this feature has been available since Prometheus 2.26 (March 2021).
- Grafana exemplar UI configuration (data source > Exemplars section, internal link, label name `trace_id`/`traceID`, URL pattern `${__value.raw}`) is consistent with current Grafana docs.
- The OneUptime remote write URL and bearer-token header pattern are product-specific and were not independently verified; the surrounding Prometheus `remote_write` config is syntactically correct.
- Stylistic suggestion (not changed): the post mentions both `trace_id` and `traceID` in different examples. Standardizing on one convention per ecosystem would reduce reader confusion, but the post explicitly calls this out in the "Label Consistency" section so it is acceptable as-is.

# Validation Summary: How to Configure Custom Metrics Endpoints in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar metrics, Configuration CRD, Kubernetes annotations)
- Prometheus (scrape configuration, relabel configs, PromQL)
- Node.js (Express, prom-client library)
- Kubernetes (pod annotations, service discovery)

## Sources Consulted
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Arguments and Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Prometheus Configuration Reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found

1. **`dapr.io/enable-metrics` is not a valid pod annotation.** The blog listed `dapr.io/enable-metrics: "true"` as a Kubernetes pod annotation. According to official Dapr docs, metrics enabling/disabling is controlled via the Configuration CRD (`spec.metrics.enabled`) or the `--enable-metrics` daprd CLI flag, not via a pod annotation. Removed the annotation from the example. Metrics are enabled by default.

2. **Configuration CRD used `spec.metric` (singular) instead of `spec.metrics` (plural).** The blog had `spec.metric` for the `enabled` and `port` fields, and a separate `spec.metrics` for the `rules`. The correct field name per official Dapr documentation is `spec.metrics` (plural) for all metrics configuration. Fixed by merging everything under `spec.metrics`.

3. **`port` is not a valid field under `spec.metrics` in the Configuration CRD.** The blog included `port: 9091` under the metrics configuration. The metrics port is configured exclusively via the `dapr.io/metrics-port` Kubernetes annotation or the `--metrics-port` daprd CLI flag, not through the Configuration CRD. Removed the invalid `port` field.

4. **Unused `DaprClient` import in Node.js example.** The code imported `const { DaprClient } = require('@dapr/dapr')` but never used it anywhere in the example. Removed the unused import to avoid confusion.

5. **Unused `start` variable in `processOrder` function.** `const start = Date.now()` was declared but never referenced. Removed the dead code.

## Review Notes
- The Dapr metric rules shown in the blog use a simplified format (listing label names without regex transformations). The official Dapr docs primarily show rules with `regex` fields for label value transformation to reduce cardinality. The blog's usage of just listing label names is a valid simplified subset, but readers may want to consult the official docs for the full regex-based transformation syntax.
- The Prometheus relabel configuration is correct and follows standard practices for Kubernetes service discovery with pod annotation filtering.
- The prom-client library usage (Counter, Histogram, register) follows correct API patterns.

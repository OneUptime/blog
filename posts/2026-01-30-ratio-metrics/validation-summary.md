# Validation Summary: How to Create Ratio Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus / PromQL
- OpenTelemetry (Python SDK)
- OpenTelemetry (Node.js SDK — `@opentelemetry/sdk-metrics`, `@opentelemetry/exporter-prometheus`)
- Prometheus Go client (`github.com/prometheus/client_golang/prometheus`, `promauto`)
- Prometheus alerting rules (YAML)
- Mermaid diagrams
- SLO / Error budget / Burn rate concepts (Google SRE Workbook)

## Sources Consulted
- Prometheus query functions documentation (rate, sum, clamp_min): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- OpenTelemetry Python Metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry JS Metrics SDK: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/sdk-metrics
- OpenTelemetry JS Prometheus Exporter: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-exporter-prometheus
- Prometheus Go client library (`promauto`): https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promauto
- Google SRE Workbook, Chapter 5 (Alerting on SLOs / Multi-Window, Multi-Burn-Rate Alerts): https://sre.google/workbook/alerting-on-slos/

## Issues Found
No technical issues found.

The code samples are syntactically correct and use current, non-deprecated APIs:
- Python OpenTelemetry `meter.create_counter(name=..., description=..., unit="1")` matches the current API signature.
- Node.js OpenTelemetry uses `MeterProvider` from `@opentelemetry/sdk-metrics` (the current package; the older `@opentelemetry/sdk-metrics-base` was renamed), the `PrometheusExporter` from `@opentelemetry/exporter-prometheus` with default port 9464, and `addMetricReader()` which is the correct way to register a reader.
- Go Prometheus client uses `promauto.NewCounterVec` with `prometheus.CounterOpts` and `WithLabelValues(...).Inc()` — all current API.
- PromQL queries are valid: `rate()`, `sum by ()`, `clamp_min()`, `sort_desc()`, `and` operator, and the `humanizePercentage` template function are all real and used correctly.
- Burn rate math is correct: 0.5% error rate / 0.1% budget = 5x burn rate; a 5x burn rate exhausts a 30-day budget in roughly 6 days.

## Review Notes
- The multi-burn-rate alert values used in the example (14x over a 2-minute window for fast burn, 2x over 1 hour for slow burn) are reasonable variants rather than the exact Google SRE Workbook recommendations (which typically use 14.4x over 1 hour and 6x over 6 hours for a 30-day SLO). The post does not claim to follow Google's exact values, so the chosen approximations are acceptable as illustrative examples.
- The `clamp_min(denominator, 1)` defensive pattern guards against division-by-zero and NaN/Inf, but it also causes ratios to *underestimate* when the rate is below 1 RPS. This is an acceptable trade-off for alerting purposes (and the post separately addresses low-traffic noise with an explicit traffic threshold), but readers should be aware that the clamp slightly biases the ratio downward at very low traffic.
- The `unit="1"` value in the Python counter follows OpenTelemetry semantic conventions for dimensionless counts (UCUM "1" annotation).
- The Mermaid diagrams render correctly and use valid Mermaid syntax (`graph LR`, `graph TD`, `graph TB`, `flowchart TD`, `subgraph`).

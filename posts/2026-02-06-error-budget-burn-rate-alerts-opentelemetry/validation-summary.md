# Validation Summary: How to Set Up Error Budget Burn Rate Alerts That Page On-Call Engineers via

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry Collector
- OpenTelemetry Collector metricstransform processor
- OpenTelemetry Collector Prometheus Remote Write exporter
- Prometheus alerting rules
- PromQL rate and increase queries
- SLOs, error budgets, and multi-window burn-rate alerting

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python manual instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Collector prometheusremotewriteexporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/prometheusremotewriteexporter
- OpenTelemetry Collector metricstransformprocessor package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Prometheus HTTP API remote write receiver documentation: https://prometheus.io/docs/prometheus/2.55/querying/api/#remote-write-receiver
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/2.52/querying/functions/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The PromQL examples depended on the OpenTelemetry-to-Prometheus metric name translation but did not state that assumption. Added a note explaining that the queries assume Collector-normalized names and that Prometheus-compatible exporters should not add another `_total` suffix when a monotonic sum name already ends in `_total`.
- The Collector example remote writes to `http://prometheus:9090/api/v1/write` but did not mention that Prometheus must be configured as a remote write receiver. Added the required `--web.enable-remote-write-receiver` caveat for direct writes to Prometheus.
- The remaining budget query was labeled as returning a percentage, but the expression returns a fraction such as `0.75`. Changed the comment to "fraction" while preserving the explanatory text that maps `0.75` to 75%.

## Review Notes
The Python metrics snippet uses the current OpenTelemetry API shape (`metrics.get_meter`, `create_counter`, `create_histogram`, `Counter.add`, and `Histogram.record`). The local review environment did not have the `opentelemetry` Python package installed, so the snippet was verified against official API documentation rather than executed locally. The SRE burn-rate windows and thresholds in the post match the examples and recommended starting points in the Google SRE Workbook for the 1h/5m, 6h/30m, and 24h/2h alert pairs.

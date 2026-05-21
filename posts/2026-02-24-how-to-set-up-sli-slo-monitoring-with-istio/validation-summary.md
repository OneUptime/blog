# Validation Summary: How to Set Up SLI/SLO Monitoring with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio standard metrics
- Istio Telemetry API
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Grafana dashboards
- SLO burn-rate alerting
- Sloth SLO definitions

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Customizing Metrics with Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio Classifying Metrics Based on Request or Response: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- Sloth getting started example: https://sloth.dev/examples/default/getting-started/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The error-budget query referenced `istio_sli:availability:ratio_rate30d`, but the recording-rules example did not define that series. Added a 30-day availability recording rule using `increase()` over the 30-day SLO window so the later dashboard/query example has a defined metric to read.

## Review Notes
- The Istio metric names, standard labels, and Telemetry API fields used in the post match current Istio documentation.
- The `request_url_path` custom tag is technically valid, but path labels can create high-cardinality metrics if raw or user-specific paths are recorded. In production, prefer bounded route or operation labels where possible.
- Multi-window burn-rate thresholds of 14.4x for 1h/5m and 6x for 6h/30m match the Google SRE Workbook examples for a 99.9% SLO.
- `promtool` was not installed in the local environment, so Prometheus rule syntax was reviewed manually against the official rule and PromQL documentation.

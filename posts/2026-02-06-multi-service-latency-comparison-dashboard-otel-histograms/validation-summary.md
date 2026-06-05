# Validation Summary: How to Create a Multi-Service Latency Comparison Dashboard from OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics and semantic conventions
- OpenTelemetry Collector OTLP receiver, batch processor, and Prometheus Remote Write exporter
- Prometheus classic histograms and PromQL
- Grafana dashboard variables and heatmap visualization

## Sources Consulted
- OpenTelemetry HTTP semantic convention metrics: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus remote storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Grafana heatmap visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/heatmap/
- Grafana Prometheus query editor documentation: https://grafana.com/docs/grafana-cloud/connect-externally-hosted/data-sources/prometheus/query-editor/

## Issues Found
- The listed default advisory bucket boundaries for `http.server.request.duration` included `0`. The current OpenTelemetry HTTP semantic convention advisory boundaries start at `0.005` seconds, so the boundary list was corrected.
- The Collector config tried to upsert `service.name` from the same `service.name` resource attribute. That does not add a missing value and does not by itself make `service_name` available as a Prometheus label for the queries. The resource processor block was removed and `resource_to_telemetry_conversion.enabled: true` was added to the `prometheusremotewrite` exporter so resource attributes are converted to metric labels.
- The remote write endpoint points at Prometheus' `/api/v1/write` endpoint, which requires Prometheus' remote write receiver to be enabled. A note was added to run Prometheus with `--web.enable-remote-write-receiver` or use another remote-write-compatible backend.

## Review Notes
The PromQL examples are valid for classic Prometheus histograms produced with the default OpenTelemetry-to-Prometheus translation strategy, where `http.server.request.duration` with unit `s` is exposed as `http_server_request_duration_seconds_bucket`, `_sum`, and `_count`. The `service_name` label depends on converting resource attributes into metric labels as configured in the corrected Collector snippet.

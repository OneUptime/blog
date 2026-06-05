# Validation Summary: How to Monitor Grafana Itself by Scraping Its Built-In Prometheus Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana internal metrics
- Prometheus metrics and alerting rules
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry OTLP exporter
- Docker Compose

## Sources Consulted
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana monitoring documentation: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-grafana-monitoring/
- Grafana v13 database metrics deprecation notice: https://grafana.com/whats-new/2026-04-14-grafana-database-metrics-deprecation/
- Grafana source for HTTP request metrics: https://github.com/grafana/grafana/blob/main/pkg/middleware/request_metrics.go
- Grafana source for data source request metrics: https://github.com/grafana/grafana/blob/main/pkg/infra/httpclient/httpclientprovider/datasource_metrics_middleware.go
- Grafana source for alerting scheduler metrics: https://github.com/grafana/grafana/blob/main/pkg/services/ngalert/metrics/scheduler.go
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- Replaced non-current or incorrect Grafana metric names for dashboard loading and request totals with current rendering, HTTP histogram count, and data source histogram metrics from Grafana source.
- Updated the collector metric relabel regex to keep both `grafana_.*` and `go_sql_.*` metrics, because Grafana v13 deprecates `grafana_database_conn_*` in favor of `go_sql_*`.
- Removed the obsolete Docker Compose top-level `version` field and fixed the collector volume mount to use the same `otel-collector-config.yaml` file name shown in the configuration snippet.
- Converted the alert examples from pseudo-YAML using `condition` and `message` into valid Prometheus alerting rule syntax using `groups`, `rules`, `expr`, and `annotations`.
- Fixed PromQL for histogram alerts to use `histogram_quantile()` over `rate(..._bucket[5m])`, and updated error-rate examples to use labels and metrics that Grafana actually exposes.
- Updated the database metrics section to use the current `go_sql_*` metrics and corrected the wait-duration metric name.

## Review Notes
The collector and Docker examples use `latest` image tags, which are valid but can drift over time. Pinning known-good image versions would make the tutorial more reproducible in the future.

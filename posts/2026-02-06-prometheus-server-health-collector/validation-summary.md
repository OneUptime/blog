# Validation Summary: How to Monitor Prometheus Server Health with the Collector

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus TSDB
- Prometheus alerting rules
- Prometheus scrape and self-monitoring metrics
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector OTLP exporter
- Docker Compose

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus configuration documentation for scrape and metric relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus source for TSDB, WAL, scrape, and query engine metric names: https://github.com/prometheus/prometheus
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver
- OpenTelemetry Collector component documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- Corrected the opening explanation from saying Prometheus uses `/metrics` for service discovery to saying it uses `/metrics` for scraping. Service discovery is configured separately; `/metrics` is the scrape endpoint.
- Corrected the alert snippets to use Prometheus alert rule syntax: `expr` instead of `condition`, `labels` for `severity`, `annotations` for messages, and Prometheus template variables such as `{{ $value }}` and `{{ $labels.instance }}`.
- Corrected the slow compaction alert. `prometheus_tsdb_compaction_duration_seconds` is a histogram, so the alert now queries `prometheus_tsdb_compaction_duration_seconds_bucket` with `histogram_quantile`.
- Corrected the Docker Compose Collector mount from `./otel-config.yaml` to `./otel-collector-config.yaml` so it matches the configuration filename shown earlier in the post.
- Corrected `prometheus_engine_queries` from "Total queries executed" to "Current queries executing or waiting", matching the Prometheus query engine metric.
- Corrected the query performance paragraph to reference the full metric name `prometheus_engine_query_duration_seconds`.

## Review Notes
The metric names in the main TSDB, WAL, scrape, resource, storage, and query-performance lists were checked against Prometheus documentation/source and are valid for current Prometheus releases. The Collector configuration follows the Prometheus receiver's embedded scrape configuration format and uses current Collector pipeline, resource processor, batch processor, and OTLP exporter structure.

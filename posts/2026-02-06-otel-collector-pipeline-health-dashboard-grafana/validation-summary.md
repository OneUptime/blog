# Validation Summary: How to Create an OpenTelemetry Collector Pipeline Health Dashboard in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- Prometheus scrape configuration and PromQL
- Grafana dashboards
- Prometheus alerting rules

## Sources Consulted
- OpenTelemetry Collector internal telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector scaling guidance: https://opentelemetry.io/docs/collector/scaling/
- Prometheus configuration reference: https://prometheus.io/docs/operating/configuration/

## Issues Found
- The Collector telemetry configuration used `service.telemetry.metrics.address`, which current OpenTelemetry documentation says is ignored as of Collector v0.123.0. Updated the example to use `service.telemetry.metrics.readers[].pull.exporter.prometheus.host` and `port`.
- The post listed OpenTelemetry metric names without explaining that Prometheus adds `_total` to counter metrics by default. Added a short clarification before the PromQL examples.
- The "Data Loss Indicator" section described the accepted-minus-sent query as directly revealing drops. Updated the wording to call it a pipeline balance indicator because retries, filters, sampling, batching delay, and multiple exporters can make that query imprecise.
- The alert named `OtelCollectorDroppingSpans` used exporter send failures, which indicate export failures and do not always imply dropped data because retries may still succeed. Renamed it to `OtelCollectorExportFailures` and adjusted the comment.

## Review Notes
The remaining metric names and PromQL patterns align with current OpenTelemetry Collector internal telemetry guidance. Queue size and capacity are gauges; accepted, refused, sent, and send-failed signal metrics are counters that commonly appear with the `_total` suffix in Prometheus.

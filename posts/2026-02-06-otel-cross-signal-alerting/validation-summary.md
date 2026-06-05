# Validation Summary: How to Set Up Cross-Signal Alerting: Trigger Alerts When Metric Anomalies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry spanmetrics connector
- Prometheus / PromQL alerting rules
- Grafana Mimir
- Grafana Alerting
- Grafana Loki / LogQL
- Grafana Tempo / TraceQL
- Prometheus Alertmanager

## Sources Consulted
- OpenTelemetry Collector Contrib spanmetrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana Alerting overview and managed alert rule documentation: https://grafana.com/docs/grafana/latest/alerting/
- Grafana expression query documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/expression-queries/
- Grafana Loki LogQL documentation: https://grafana.com/docs/loki/latest/logql/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/

## Issues Found
- The OpenTelemetry Collector metrics pipeline used `prometheusremotewrite` as the exporter component ID. Current Collector component naming uses `prometheus_remote_write`, so the snippet was updated accordingly.
- The Grafana provisioned alert example used an older/internal expression datasource UID and a classic condition shape that did not clearly encode an AND condition between the metric and log queries. It was updated to use `datasourceUid: __expr__`, fixed relative time ranges, and a Math expression of `$A > 2 && $B > 50`.
- The Alertmanager routing example used deprecated `match` blocks. It was updated to current `matchers` syntax.

## Review Notes
- The PromQL examples are conceptually valid for spanmetrics-derived Prometheus metrics, assuming the Collector configuration and Prometheus normalization produce the shown `span_*` metric names.
- The Grafana Explore URLs are illustrative and may need URL encoding or Grafana-version-specific URL state formatting in a production alert template.

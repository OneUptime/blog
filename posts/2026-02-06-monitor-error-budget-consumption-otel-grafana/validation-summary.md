# Validation Summary: How to Monitor Error Budget Consumption Rate in Real Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry span metrics connector
- Prometheus recording rules and PromQL
- Grafana dashboards, annotations, and alerting
- Python requests library
- SRE error budgets and burn-rate alerting

## Sources Consulted
- OpenTelemetry Collector span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafana Annotations HTTP API documentation: https://grafana.com/docs/grafana/latest/developers/http_api/annotations/
- Grafana Alerting documentation: https://grafana.com/docs/grafana/latest/alerting/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The Collector configuration used the deprecated `spanmetrics` component key. Updated the connector key and pipeline references to `span_metrics`, which is the current OpenTelemetry Collector component name.
- The Prometheus queries referenced `otel_traces_spanmetrics_calls_total`. With the span metrics connector's default `traces.span.metrics` namespace and the Collector Prometheus exporter's `otel` namespace, the normalized counter name is `otel_traces_span_metrics_calls_total`. Updated all recording rules and dashboard queries accordingly.
- The `slo:burn_rate:1h` recording rule was based on the 5-minute error ratio, despite being named and used as a one-hour burn rate. Updated the rule to calculate the error ratio from one-hour request and error rates.
- The `slo:budget_consumed:30d` rule comment described the value as a percentage, but the expression returns a fraction of the budget that is later multiplied by 100 for percentage display. Updated the comment to avoid mislabeling the unit.

## Review Notes
- The examples assume an SLO with a 99.9% success target, so the allowed error ratio is `0.001`. A production implementation should make that target explicit or parameterize it if different services have different SLOs.
- `promtool` was not installed in the workspace, so the Prometheus rules were reviewed against official Prometheus syntax and function documentation rather than checked with the CLI.

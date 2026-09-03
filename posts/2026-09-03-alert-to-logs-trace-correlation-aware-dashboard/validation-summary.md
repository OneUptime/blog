# Validation Summary: How to Jump from an Alert to the Exact Logs and Trace Using a Correlation-Aware Dashboard

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus alerting rules and PromQL aggregation
- Alertmanager notification templates
- Grafana dashboards, URL variables, data links, and managed alert notifications
- OpenTelemetry exemplars and trace-context log fields
- Grafana Tempo trace correlation and span-derived metrics
- Grafana Loki, LogQL, derived fields, and structured metadata
- Distributed tracing, sampling, retention, and telemetry correlation

## Sources Consulted
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus notification template reference](https://prometheus.io/docs/alerting/latest/notifications/)
- [Grafana dashboard URL variables](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard-url-variables/)
- [Grafana data links and actions](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-data-links/)
- [Grafana notification template examples](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/template-notifications/examples/)
- [Grafana Prometheus data source exemplar configuration](https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/)
- [Grafana Tempo trace-to-logs correlation](https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/)
- [Grafana Tempo span metrics processor](https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/)
- [Grafana Loki data source derived fields](https://grafana.com/docs/grafana/latest/datasources/loki/configure/)
- [OpenTelemetry trace context in non-OTLP log formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)

## Issues Found
No technical issues found.

## Review Notes
The post correctly treats exemplars as representative rather than causal or comprehensive, distinguishes Grafana-managed alert template fields from Prometheus/Alertmanager fields, and warns that trace sampling can make unadjusted span-derived counts unsuitable as authoritative traffic totals. Exact field and label mappings remain deployment-specific, as the post notes, and should be tested against the deployed Grafana, Tempo, Loki, and ingestion configuration.

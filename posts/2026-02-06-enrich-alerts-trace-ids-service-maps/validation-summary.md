# Validation Summary: How to Enrich Alert Payloads with OpenTelemetry Trace IDs, Service Maps,

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Collector Prometheus exporter
- Prometheus alerting and recording rules
- Prometheus exemplars
- Alertmanager Slack and PagerDuty notifications
- Grafana and Tempo deep links
- Argo CD deployment links

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK metrics API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus feature flags documentation for exemplar storage: https://prometheus.io/docs/prometheus/latest/feature_flags/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/

## Issues Found
- The post said Prometheus alert annotations can reference stored exemplar trace IDs directly. Prometheus can store exemplars, and Grafana can use them for dashboard-to-trace links, but alert rule templates do not expose exemplar labels. I changed the wording to recommend trace search links in alert annotations or a separate webhook enrichment step for attaching a specific exemplar trace ID.
- The Python exemplar comments overstated automatic exemplar capture. I changed the example to explicitly configure `TraceBasedExemplarFilter` and clarified that measurements recorded in the context of a sampled span are eligible for exemplars.
- Several generated URLs inserted raw label values into query strings. I added Prometheus `urlQueryEscape` in the alert annotations and percent-encoded the fixed Grafana Explore JSON query structure.
- The deployment recording rule used `max by (service_name)`, which would drop the `version` label and would not select the most recent deployment unless the metric value represented deployment time. I changed the example to state that `deploy_info` uses the deployment timestamp as its value and switched the rule to `topk by (service_name) (1, ...)`, which preserves the selected series' original labels.
- The deployment annotation query used single quotes inside a PromQL label matcher. PromQL label matcher strings use double quotes, so I corrected the template string.

## Review Notes
The Alertmanager Slack and PagerDuty fields, template functions, and `.Alerts.Firing` / `.Alerts.Resolved` usage match the current Alertmanager documentation. The OpenTelemetry Collector `enable_open_metrics` option is valid for exposing exemplars in OpenMetrics format for supported metric types.

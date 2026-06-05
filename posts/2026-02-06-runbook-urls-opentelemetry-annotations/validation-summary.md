# Validation Summary: How to Attach Runbook URLs to OpenTelemetry Pipeline Annotations

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Collector Prometheus exporter
- Prometheus alerting rules and annotations
- Alertmanager PagerDuty and Slack receivers

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logs documentation: https://opentelemetry.io/docs/languages/python/instrumentation/#logs
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/

## Issues Found
- The telemetry source example claimed traces, metrics, and logs carried the runbook resource, but only initialized trace and metric providers. Added `LoggerProvider(resource=resource)` using the OpenTelemetry Python logging SDK import shown in the official docs.
- The Prometheus label conversion explanation did not specify the Prometheus exporter setting and omitted label normalization. Clarified that `resource_to_telemetry_conversion` belongs to the Prometheus exporter and that dotted attribute names are exposed with Prometheus-safe label names such as `service_runbook_url`.
- The Collector snippet referenced an `otlp` receiver, `batch` processor, and exporters without defining them, and defined `attributes/runbooks` without adding it to pipelines. Added minimal receiver, batch processor, exporter configuration, and included `attributes/runbooks` in the metrics and traces pipelines.
- The Collector comment said routing was used for service-specific runbooks, but the snippet uses transform processor OTTL statements. Updated the comment to refer to transform rules.
- The Alertmanager notification templates used `.CommonAnnotations.runbook_url` and `.CommonAnnotations.dashboard_url`, which can be empty for grouped alerts when individual alerts have different annotations. Updated the PagerDuty and Slack examples to iterate over `.Alerts.Firing` and render each alert's own annotations.
- The Slack receiver omitted an API URL or global webhook configuration, so the standalone example was incomplete. Added an `api_url` placeholder.
- The Alertmanager route example only defined receivers, not routing. Added a minimal route that sends `team="payments"` alerts to both PagerDuty and Slack.

## Review Notes
The custom runbook attributes are technically valid as custom OpenTelemetry attributes, but they are not OpenTelemetry semantic convention attributes. Teams should keep cardinality low and prefer stable runbook URLs because enabling `resource_to_telemetry_conversion` copies resource attributes onto all exported Prometheus metric series.

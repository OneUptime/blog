# Validation Summary: How to Use Correlation-Based Alerting That Links Related Alerts Across

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry resource attributes and trace context
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector Prometheus exporter
- Prometheus Alertmanager
- SQL
- Python

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/

## Issues Found
- The OpenTelemetry Collector example referenced the `otlp` receiver in the metrics pipeline but did not define it. Added an `otlp` receiver with gRPC and HTTP protocols so the snippet is structurally complete.
- The Collector example used `service.tier` in the Alertmanager routing example but did not copy that resource attribute into metric labels. Added `service.tier` to the transform processor statements so the normalized `service_tier` alert label can exist.
- The Collector example combined explicit transform-based label copying with `resource_to_telemetry_conversion`, which would copy all resource attributes into metric labels and was redundant for the selected-label approach recommended by the Prometheus exporter documentation. Removed `resource_to_telemetry_conversion` and kept the transform processor approach.
- The SQL topology query used the `call_count` alias in the `HAVING` clause. Changed it to `HAVING COUNT(*) > 10` for better SQL compatibility.
- The Alertmanager example used deprecated `match` and `match_re` route fields. Updated the routes to use current `matchers` syntax.
- The Python snippet used snake_case `starts_at`, but Alertmanager webhook and alert payload fields use `startsAt`. Updated the field references to `startsAt`.
- The Python snippet called an undefined `query_traces` helper. Changed `enrich_alert_group` to accept `query_traces` as an injected function so the dependency is explicit.
- The Python snippet imported unused modules. Removed the unused imports.

## Review Notes
The correlation rules YAML is presented as an example configuration for a custom correlation engine, not a standard OpenTelemetry or Alertmanager schema. The SQL query remains backend-dependent because OpenTelemetry does not define a universal SQL schema for stored span data.

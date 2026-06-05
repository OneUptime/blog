# Validation Summary: How to Use Multi-Channel Alert Routing from OpenTelemetry Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry HTTP metric semantic conventions
- Prometheus metrics and alerting rules
- Alertmanager routing and receivers
- PagerDuty notifications
- Slack notifications
- Email notifications
- amtool

## Sources Consulted
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention stability migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager/amtool README: https://github.com/prometheus/alertmanager

## Issues Found
- The PromQL examples filtered on `http_status_code`, which reflects older HTTP semantic conventions. Current OpenTelemetry HTTP metrics use `http.response.status_code`; with the default Prometheus translation this becomes the `http_response_status_code` label. Updated all three alert expressions.
- The Alertmanager examples used the deprecated `match` route syntax. Updated the examples to use `matchers` with explicit matcher expressions, matching current Alertmanager documentation and the UTF-8 matcher transition guidance.
- The team-based routing snippet could be interpreted as adding team-specific critical routes as top-level siblings after the general critical routes, which would not route as intended. Updated it to show team routes nested under the critical PagerDuty route while preserving `continue: true` so critical alerts can still continue to the Slack receiver.

## Review Notes
The OpenTelemetry Collector Prometheus exporter configuration, Prometheus alert rule structure, Alertmanager receiver fields, and `amtool config routes test` command form are technically valid. Local `amtool` and `promtool` binaries were not installed in the review environment, so I could not run full schema validation with those tools; I did verify the edited YAML snippets parse successfully.

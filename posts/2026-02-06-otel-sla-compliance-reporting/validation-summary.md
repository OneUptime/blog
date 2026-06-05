# Validation Summary: How to Use OpenTelemetry to Measure and Report on SLA Compliance Across

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry spanmetrics connector
- OpenTelemetry OTLP receiver and OTLP HTTP exporter
- Prometheus exporter
- Prometheus recording rules and alerting rules
- PromQL
- Python
- YAML

## Sources Consulted
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus client compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.0/querying/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/3.4/querying/functions/
- Prometheus histogram and summary best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/3.0/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/

## Issues Found
- The Collector config used the deprecated `spanmetrics` component name. Updated it to `span_metrics`, matching the current OpenTelemetry Collector spanmetrics connector documentation.
- The spanmetrics duration histogram relied on the default unit. Added `histogram.unit: ms` so the generated Prometheus metric name remains consistent with the later `sli_duration_milliseconds_bucket` PromQL examples, despite the documented upcoming default-unit change.
- The availability recording rule filtered on `status_code`, which is the sanitized default span status label, not the added HTTP response status-code dimension. Updated it to `http_response_status_code` so the rule measures non-5xx HTTP responses as described.
- The SLA definitions included a `latency_p50` objective, but the Python reporter only evaluated availability and p99 latency. Added a p50 latency check that uses the existing `sli:latency_p50:seconds` recording rule.
- The Python example imported `timedelta` without using it and used `datetime.utcnow()`. Replaced this with `datetime.now(timezone.utc)` for current, timezone-aware UTC timestamp handling.

## Review Notes
- The Markdown Python block parses successfully with Python `ast`.
- All YAML blocks parse successfully with PyYAML.
- `promtool` is not installed in this workspace, so Prometheus rule validation could not be run locally.
- The Prometheus error-budget recording rule uses a hardcoded 99.9% target. This is syntactically valid and useful as an example, but a production implementation should generate per-service or per-tier error-budget rules from the same SLA definitions used by the reporter.

# Validation Summary: How to Set Up Error Alerting Policies Based on OpenTelemetry Error Rate Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry span metrics connector
- OpenTelemetry HTTP semantic conventions
- Prometheus recording rules and alerting rules
- PromQL burn-rate alert expressions
- Alertmanager routing, PagerDuty, and Slack receivers
- Python requests

## Sources Consulted
- OpenTelemetry span metrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The OpenTelemetry connector snippet used the deprecated `spanmetrics` component name. Updated it to `span_metrics`, including the pipeline references, to match the current connector naming.
- The post used the old/generated metric name `traces_spanmetrics_calls_total`. Updated PromQL examples to use `traces_span_metrics_calls_total`, matching the current default span metrics namespace translated by the Prometheus exporter.
- The error label filter used `status_code="STATUS_CODE_ERROR"`. Updated it to `status_code="Error"`, which matches the span metrics connector's documented status code dimension value after Prometheus label-name normalization.
- The HTTP method dimension used `http.method`. Updated it to `http.request.method`, which is the stable OpenTelemetry HTTP semantic convention.
- The warning burn-rate alert said it used 30m and 6h windows but queried 1h and 6h with a burn rate threshold of 1. Added the 30m recording rule and changed the warning alert to 30m/6h at 6x burn rate, matching the Google SRE multiwindow guidance for a 6-hour long window.
- The critical alert annotation rendered a burn-rate value with `humanizeDuration`, implying it was a duration. Changed the annotation to render the current burn rate with `humanize`.
- The Alertmanager routing example used deprecated `match` blocks. Updated it to current `matchers` syntax.

## Review Notes
The Prometheus and Alertmanager command-line validation tools (`promtool` and `amtool`) were not installed in this workspace, so local syntax checks could not be run. The snippets were reviewed against official documentation instead. The internal runbook URL is intentionally illustrative and was not changed.

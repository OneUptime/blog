# Validation Summary: How to Build SLO Burn Rate Alerts That Trigger PagerDuty Incidents from

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Python metrics
- Prometheus recording rules and alerting rules
- SLO burn-rate alerting
- Alertmanager routing and PagerDuty receiver configuration
- Prometheus alert annotation templating

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Prometheus/OpenMetrics compatibility spec: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus alerting rules docs: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Alertmanager configuration docs: https://prometheus.io/docs/alerting/latest/configuration/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The Python instrumentation snippet used `time.time()` without importing `time`. Added `import time` so the snippet is syntactically complete for the shown code.
- The text described the sample as an availability SLO while the code also enforced a latency threshold. Updated the wording to describe a request-based SLO that combines availability and latency.
- The remaining-budget annotation queried `service:sli_error_ratio:30d`, but the recording rules did not define that series. Added a 30-day recording rule.
- The low-priority 1x burn-rate alert was described in a multi-window section but only checked the 3-day window. Added the 6-hour confirmation window to match the multi-window, multi-burn-rate pattern.
- The Alertmanager snippet referenced `default` and `slack-slo-warnings` receivers without defining them. Added receiver stubs so the route references are internally consistent.
- The Alertmanager routes used the deprecated `match` field. Updated them to current `matchers` syntax.

## Review Notes
The Prometheus and Alertmanager command-line validation tools (`promtool` and `amtool`) were not installed in the local environment, so native config validation could not be run. The Python snippet was checked with `python3` AST parsing, and all YAML snippets parsed successfully with PyYAML. The OpenTelemetry-to-Prometheus metric names assume the common Prometheus translation behavior where dots become underscores and counters receive a `_total` suffix; deployments using a different OTLP translation strategy may need query name adjustments.

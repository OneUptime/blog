# Validation Summary: How to Build Alerting Rules with LogQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- LogQL
- Loki Ruler
- Alertmanager
- Prometheus-compatible alerting and recording rules
- Kubernetes ConfigMaps
- S3-backed ruler storage
- logcli

## Sources Consulted
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki LogCLI documentation: https://grafana.com/docs/loki/latest/query/logcli/getting-started/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The ruler remote write example used the deprecated single `client` field. Updated it to the current `clients` map format.
- The Kubernetes ConfigMap storage example used `type: configdb`, which is not the documented way to use ConfigMap-mounted rule files. Updated it to local ruler storage with `/loki/rules`.
- HTTP error-rate alerts produced a ratio while formatting `$value` as a percentage. Updated the expressions to multiply by 100 and compare against percentage thresholds.
- Unwrapped LogQL latency queries did not filter pipeline conversion errors. Added `| __error__=""` after `unwrap` in alerting, recording, and ConfigMap examples.
- The high-log-volume annotation used `humanizeBytes`, which is not a Prometheus alert template function. Replaced it with `humanize1024` and an explicit `B` suffix.
- The ruler API create/update example sent a full `groups:` rule file, but the API expects a single rule group body. Updated the payload to `name`, optional group fields, and `rules`.
- The ruler API create/delete examples omitted the tenant header used elsewhere in the post. Added `X-Scope-OrgID: production`.
- Alertmanager routes used the older `match` field. Updated them to `matchers`.
- The PagerDuty receiver used `service_key`; updated the example to `routing_key` for the Events API v2 integration.
- The alert annotation template used `now | date`, but Prometheus rule templates expose `now` and `humanizeTimestamp`, not a `date` function. Updated it to `now | humanizeTimestamp`.

## Review Notes
The post is technically relevant and now aligns with current Grafana Loki 3.7.x and Prometheus/Alertmanager documentation. I could not run `logcli`, `loki`, or `lokitool` locally because they are not installed in this workspace, so validation was performed against official documentation rather than local command execution.

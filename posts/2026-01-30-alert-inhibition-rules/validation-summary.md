# Validation Summary: How to Build Alert Inhibition Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Alertmanager
- Alertmanager inhibition rules
- Alertmanager API v2
- Prometheus recording rules and PromQL
- PagerDuty and Slack Alertmanager receivers
- YAML configuration
- Bash, curl, and jq

## Sources Consulted
- Prometheus Alertmanager documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus Alertmanager OpenAPI specification: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- Prometheus Alertmanager changelog: https://github.com/prometheus/alertmanager/blob/main/CHANGELOG.md
- Prometheus Alertmanager source for notification suppression metrics: https://github.com/prometheus/alertmanager/blob/main/notify/metrics.go
- Prometheus Alertmanager source for suppression reason labels: https://github.com/prometheus/alertmanager/blob/main/notify/mute.go

## Issues Found
- The basic inhibition rule description said it suppressed alerts for the same service, but the example scoped inhibition with `equal: alertname`. Updated the wording to say "same alert name" so it matches the configuration.
- The complete Alertmanager example used `service_key` for PagerDuty. Updated it to `routing_key`, which is the current PagerDuty Events API v2 field in Alertmanager examples.
- The API test alerts used `cluster` while the service dependency inhibition pattern above used `db_cluster` in `equal`. Updated the test alert labels to use `db_cluster` so the source and target alerts can actually match the shown rule.
- The API test filtered `.status.state == "suppressed"`, which includes both silenced and inhibited alerts. Updated the `jq` filter to check `.status.inhibitedBy | length > 0` so it specifically verifies inhibition.
- The monitoring example used Prometheus' `ALERTS{alertstate="pending"}`, which does not measure Alertmanager inhibition. Replaced it with `alertmanager_notifications_suppressed_total{reason="inhibition"}` and a recording rule name that reflects suppressed notifications over a 5-minute window.

## Review Notes
Alertmanager and Prometheus validation binaries (`amtool` and `promtool`) were not installed in the local environment, so the review was verified against current official documentation and Alertmanager source rather than by executing those tools locally.

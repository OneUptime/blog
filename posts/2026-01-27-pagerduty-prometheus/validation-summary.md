# Validation Summary: How to Use PagerDuty with Prometheus

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- PagerDuty Events API v2
- Prometheus
- Prometheus Alertmanager
- Alertmanager routing and receiver configuration
- Alertmanager notification templates
- Prometheus alerting rules and PromQL
- Alertmanager API v2

## Sources Consulted
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager Alerts API reference: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- PagerDuty Prometheus integration guide: https://www.pagerduty.com/docs/guides/prometheus-integration-guide/
- PagerDuty Dynamic Notifications severity documentation: https://support.pagerduty.com/main/docs/dynamic-notifications
- PagerDuty Event Management deduplication documentation: https://support.pagerduty.com/main/docs/event-management

## Issues Found
- PagerDuty severity examples used `high`, but PagerDuty Events API v2 severity values must be `critical`, `error`, `warning`, or `info`. Changed the high-severity PagerDuty examples to use `error`.
- Alertmanager matcher examples used unquoted matcher values such as `severity = critical`. Updated matcher examples to quote values, such as `severity="critical"`, for compatibility with current Alertmanager UTF-8 matcher guidance.
- The rich PagerDuty example referenced an undefined template, `pagerduty.clientUrl`. Replaced it with the built-in notification template data field `{{ .ExternalURL }}`.
- The optional PagerDuty image example omitted the required `href` field. Added `href` and used a separate `src` example value.
- The deduplication section showed `dedup_key` under `pagerduty_configs`, but current Alertmanager `pagerduty_config` does not support a `dedup_key` field. Reworked the example to show supported `group_by`-based grouping, which is how Alertmanager influences PagerDuty incident grouping.
- The best-practices section recommended descriptive dedup keys. Updated it to recommend descriptive `group_by` labels instead.
- The section title referred to service keys while the examples use Events API v2 routing keys. Updated the heading to "Custom event fields and integration keys."
- The Events API v2 best-practices bullet referred to custom fields, which can be confused with PagerDuty's separate custom fields feature. Updated it to say custom details.

## Review Notes
The test `curl` command matches Alertmanager API v2 requirements for posting a JSON array of alerts with `Content-Type: application/json`. `amtool` and `promtool` were not installed in the local environment, so validation was performed against official documentation rather than local CLI checks.

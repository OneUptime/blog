# Validation Summary: How to Configure Prometheus Alertmanager Routing and Receivers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Alertmanager
- Alertmanager routing trees and receivers
- Slack, PagerDuty, email, and webhook receivers
- Alertmanager inhibition rules and silences
- `amtool`
- Alertmanager high availability clustering

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager concepts documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager GitHub README and examples: https://github.com/prometheus/alertmanager
- Alertmanager API v2 OpenAPI specification: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- `amtool` command reference: https://manpages.debian.org/unstable/prometheus-alertmanager/amtool.1.en.html

## Issues Found
- Updated route examples from deprecated `match` and `match_re` fields to the current `matchers` syntax. The older fields are still supported, but official Alertmanager documentation marks them deprecated.
- Updated inhibition examples from deprecated `source_match`, `target_match`, and `target_match_re` fields to `source_matchers` and `target_matchers`.
- Corrected the `resolve_timeout` comment. It is the default timeout for alerts without `EndsAt`; Prometheus alerts include `EndsAt`, so it is not accurately described as the time before sending resolved notifications.
- Changed the critical route's `continue` value from `false` to `true` because the example text says critical alerts should continue to later matching routes. Without this, an alert with `severity=critical team=database` would stop at `pagerduty-critical` and never reach the database nested route.
- Corrected the timing diagram's repeat notification timestamp from `t=4h30s` to `t=4h5m30s`, because `repeat_interval` repeats the last notification, and the previous update was sent at `t=5m30s`.
- Changed the high availability command block language from `yaml` to `bash` and added the third Alertmanager instance so the snippet matches the "three Alertmanager instances" comment.

## Review Notes
Validated a combined Alertmanager configuration based on the post's route, receiver, and inhibition examples with `amtool check-config` from the official Alertmanager container. Also verified the route-test example resolves to `pagerduty-critical,db-pagerduty` after the `continue: true` correction.

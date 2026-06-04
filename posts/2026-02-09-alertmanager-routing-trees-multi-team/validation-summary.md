# Validation Summary: How to Configure Alertmanager Alert Routing Trees for Multi-Team K8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Alertmanager
- Alertmanager routing trees
- Alertmanager inhibition rules
- Alertmanager time intervals
- amtool
- Kubernetes ConfigMap and StatefulSet deployment
- PromQL
- Slack, PagerDuty, and email Alertmanager receivers

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager overview and routing concepts: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager GitHub releases: https://github.com/prometheus/alertmanager/releases
- Alertmanager 0.32.1 amtool CLI help output from the official release binary

## Issues Found
- Replaced deprecated `match` and `match_re` route fields with the current `matchers` syntax. The official configuration docs mark `match` and `match_re` as deprecated in favor of `matchers`.
- Replaced deprecated `source_match`, `source_match_re`, `target_match`, and `target_match_re` inhibition fields with `source_matchers` and `target_matchers`.
- Fixed examples that implied a child route with `continue: true` also sends to the parent route's receiver. Alertmanager only continues matching subsequent sibling routes, so explicit sibling routes were added where critical alerts should go to both PagerDuty/on-call and Slack/team receivers.
- Moved the security-team route before team ownership routes in the complete configuration. With the original ordering, team routes would stop matching before security alerts reached the security route.
- Split overnight `17:00` to `09:00` time ranges into `17:00` to `24:00` and `00:00` to `09:00`, matching Alertmanager's documented time range model.
- Added `America/New_York` to the after-hours interval in the time-based example so it uses the same timezone as the business-hours route instead of defaulting to UTC.
- Changed PagerDuty examples from `service_key` to `routing_key` for Events API v2-style integrations.
- Updated the Kubernetes deployment example from `prom/alertmanager:v0.26.0` to `prom/alertmanager:v0.32.1`, the current Alertmanager release available during validation.
- Fixed the notification latency PromQL example to aggregate histogram buckets by `le` and `receiver` before applying `histogram_quantile`.
- Clarified routing and inhibition prose to match Alertmanager behavior more precisely.

## Review Notes
- The complete Alertmanager configuration block was validated with `amtool check-config` from Alertmanager 0.32.1 after substituting a valid-looking Slack webhook URL only in a temporary scratch file.
- `amtool config routes test --config.file=... label=value` was verified against the 0.32.1 CLI help output.
- Temporary route tests confirmed the corrected fan-out behavior for security alerts and platform critical alerts.

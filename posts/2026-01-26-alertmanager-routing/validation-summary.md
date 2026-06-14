# Validation Summary: How to Configure Alertmanager Routing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Alertmanager
- Prometheus alerting
- Alertmanager YAML configuration
- amtool CLI
- Alertmanager API v2
- Slack, PagerDuty, email, and webhook-style receivers

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus Alertmanager Management API documentation: https://prometheus.io/docs/alerting/latest/management_api/
- Prometheus Alertmanager README and amtool route testing examples: https://github.com/prometheus/alertmanager
- Local validation with official Alertmanager container image `quay.io/prometheus/alertmanager:latest`, `amtool` version 0.32.1

## Issues Found
- The nested route example said critical backend alerts "also page", but Alertmanager routes to the matching child route receiver rather than automatically notifying both parent and child receivers. Changed the comment to say critical backend alerts use the PagerDuty receiver.
- The `after-hours` time interval used `start_time: '17:00'` with `end_time: '09:00'`. Alertmanager rejects time ranges where the start is equal to or greater than the end, so the interval was split into `17:00`-`24:00` and `00:00`-`09:00`.
- The time-based routing example used `mute_time_intervals` for the null receiver and did not account for the documented behavior that inactive or muted routes still participate in route matching and can stop sibling evaluation. Updated the example to use `active_time_intervals` for after-hours handling and added `continue: true` to the business-hours Slack route.
- The `amtool config routes test` command showed tree-style expected output but omitted the `--tree` flag. Added `--tree` to match the documented CLI behavior.
- The testing section introduced `amtool` commands as Alertmanager API validation. Updated the wording so `amtool` and API-based test alerts are described separately.

## Review Notes
Alertmanager 0.27 and later include UTF-8 matcher parsing changes. The examples use matcher syntax that remains valid, but future updates could quote matcher values consistently to reduce ambiguity when values contain YAML special characters.

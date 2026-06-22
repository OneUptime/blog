# Validation Summary: How to Create Log-Based Alerts in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Alerting
- Grafana alerting provisioning
- Grafana notification policies, contact points, silences, and mute timings
- Grafana Loki
- LogQL
- YAML configuration
- Slack, email, and PagerDuty alert notifications

## Sources Consulted
- Grafana documentation: Configure Grafana - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana documentation: Grafana Alerting fundamentals - https://grafana.com/docs/grafana/latest/alerting/fundamentals/
- Grafana documentation: Configure Grafana-managed alert rules - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/
- Grafana documentation: Queries and conditions - https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/queries-conditions/
- Grafana documentation: Annotation and label template reference - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/reference/
- Grafana documentation: Notification template reference - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/template-notifications/reference/
- Grafana documentation: Use configuration files to provision alerting resources - https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana documentation: Configure mute timings and active time intervals - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/mute-timings/
- Grafana Loki documentation: Metric queries - https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana documentation: What's new in Grafana v9.0 - https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v9-0/

## Issues Found
- The unified alerting setup snippet showed disabling legacy alerting as part of the current required configuration. Grafana 9.0 and later enable Grafana Alerting by default, and current configuration docs expose `[unified_alerting] enabled = true`; I updated the wording and removed the legacy `[alerting]` / `GF_ALERTING_ENABLED` lines.
- The error-rate alert calculated a fraction but displayed it as a percentage. I changed the query to multiply by 100, updated the threshold from `0.05` to `5`, and changed the annotation template to use `{{ printf "%.2f" $values.A.Value }}`.
- The latency alert used `| unwrap duration`, which only unwraps a label named `duration` as a numeric value. I changed it to `| unwrap duration_seconds(duration)` so Go-style duration strings are converted to seconds as documented by Loki.
- The alert provisioning example used math expressions that returned numeric values rather than boolean alert conditions. I changed the provisioned rules to set alert conditions on math comparisons such as `$A > 5`, `$A > 0`, and `$A > 20`.
- The provisioned critical-log alert counted per stream and used the raw Loki query as the condition. I changed it to sum the count and add an explicit boolean math condition.
- The provisioned authentication-failure alert used the raw Loki query as the condition. I added an explicit boolean math condition and adjusted the annotation to report `$values.A.Value`.
- The notification policy regex matcher was unquoted (`severity =~ warning|info`). I changed it to `severity =~ "warning|info"` to match Grafana's documented provisioning matcher examples.

## Review Notes
The post is technically relevant and the remaining examples are consistent with Grafana-managed alerting concepts and Loki metric-query syntax. Provisioned Grafana alert rule `model` blocks are safest when exported from Grafana for the exact Grafana version and data source plugin, because the internal model shape can vary across versions.

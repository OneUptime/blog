# Validation Summary: How to Create Grafana Notification Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Alerting
- Grafana notification policies
- Grafana contact points
- Grafana alerting provisioning files
- Grafana Alerting Provisioning HTTP API
- YAML configuration

## Sources Consulted
- Grafana documentation: Configure notification policies - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-notification-policy/
- Grafana documentation: Notification policies fundamentals - https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/notification-policies/
- Grafana documentation: Group alert notifications - https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/group-alert-notifications/
- Grafana documentation: Configure mute timings and active time intervals - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/mute-timings/
- Grafana documentation: File provisioning for alerting resources - https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana documentation: Alerting Provisioning HTTP API - https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/alerting_provisioning/

## Issues Found
- Updated the Grafana UI navigation and child policy button text to match current Grafana documentation.
- Replaced non-provisioning fields such as `matching_labels`, `contact_point`, and nested `timing` in configuration examples with Grafana route fields such as `matchers`, `receiver`, `group_wait`, `group_interval`, and `repeat_interval`.
- Corrected the `group_by: ["..."]` explanation. In Grafana, an empty `group_by` creates a single group for all alerts, while `...` disables grouping and sends alerts separately.
- Corrected the mute timing provisioning example to use `muteTimes` and `time_intervals`, then apply the mute timing with `mute_time_intervals` on a route.
- Corrected the nested child policy example where `continue: true` was described as also notifying the parent policy. Grafana routes to the deepest matching child policy; `continue` applies to sibling matching.
- Updated the route testing expected result because the sample alert also matches the critical sibling policy when `continue: true` is enabled.
- Adjusted the test alert rule example so it no longer presents an incomplete Grafana alert rule provisioning object as directly usable YAML.

## Review Notes
Grafana's `repeat_interval` is evaluated on group interval boundaries, should be greater than or equal to `group_interval`, and is coerced to a multiple of `group_interval` if needed. The post's example values remain valid.

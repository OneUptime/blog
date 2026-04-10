# Validation Summary: How to Automate Ceph Capacity Alerts and Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster capacity management)
- Rook (Ceph operator for Kubernetes)
- Prometheus (monitoring and alerting rules)
- Prometheus Operator (PrometheusRule CRD)
- Alertmanager (alert routing and notification)
- Grafana (dashboard PromQL queries)
- PagerDuty (incident notification)
- Slack (webhook notifications)

## Sources Consulted
- Ceph documentation on OSD full ratios: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph mgr Prometheus module metrics: https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus Operator API reference for PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/
- PromQL documentation for `predict_linear` and `deriv`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Alertmanager configuration reference (route, slack_configs, pagerduty_configs): https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
No technical issues found.

## Review Notes
- The PagerDuty configuration uses `service_key`, which corresponds to the PagerDuty v1 Events API. The v2 API uses `routing_key` instead. Both are supported by Alertmanager, so this is not an error, but new integrations may prefer `routing_key` for v2.
- The `CephPoolCapacity90Percent` alert divides by `ceph_pool_max_bytes`, which is 0 when no pool quota is set. In PromQL, division by zero produces NaN/+Inf, which won't satisfy `> 90`, so the alert simply won't fire for unquota'd pools. This is correct behavior but worth noting for readers who expect it to cover all pools.
- The Alertmanager snippet references a `default` receiver that isn't defined in the example. This is expected for a snippet (not a complete config), but readers should ensure they define all referenced receivers in their full configuration.
- The `deriv()` dashboard query for time-until-full will produce negative values if usage is decreasing, which is mathematically correct but could confuse dashboard viewers. A `clamp_min(..., 0)` wrapper or conditional could improve the UX, though this is a style choice rather than a technical error.

# Validation Summary: How to Implement Log-Based Alerting for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (microservices runtime)
- Grafana Loki (LogQL alert rules, provisioned alert configuration)
- Grafana Alertmanager (alert routing)
- Elasticsearch Watcher (log-based alerting via X-Pack)
- AWS CloudWatch Logs (metric filters and alarms)
- AWS CLI (`aws logs put-metric-filter`, `aws cloudwatch put-metric-alarm`)

## Sources Consulted
- Grafana alert rule provisioning documentation (file provisioning YAML format, `apiVersion: 1`, rule fields)
- Grafana Loki LogQL documentation (`count_over_time`, `rate`, stream selectors, line filter expressions)
- Elasticsearch Watcher API documentation (`PUT _watcher/watch`, trigger/input/condition/action structure)
- Elasticsearch 7.x query DSL documentation (`bool/filter`, `hits.total.value` object format)
- AWS CloudWatch Logs filter pattern syntax documentation (JSON filter patterns, wildcard support)
- AWS CLI reference for `put-metric-filter` and `put-metric-alarm` commands
- Alertmanager routing configuration documentation (`match` vs `matchers` syntax)

## Issues Found
1. **Loki error rate threshold mismatch (line 66)**: The description states the alert fires when "the error rate exceeds 5 errors per minute," but the threshold was set to `0.08` errors/second. Since LogQL `rate()` returns entries per second, `0.08 * 60 = 4.8` errors/minute, not 5. Changed the threshold to `0.083` (5/60 = 0.0833 errors/second) to accurately match the described behavior.

## Review Notes
- The Grafana provisioned alert rule uses `queryType: range` at the data-query level. While this works in practice, the canonical value for Loki queries in provisioned alerts is an empty string (`""`). This is not an error but worth noting for strict adherence to documented defaults.
- The Alertmanager routing configuration uses the `match` field, which is deprecated in favor of `matchers` in newer Alertmanager versions. Both are still functional, but future blog updates could migrate to the `matchers` syntax (e.g., `matchers: ['severity="critical"']`).
- The Elasticsearch Watcher example uses `ctx.payload.hits.total.value`, which is correct for Elasticsearch 7+. Users on Elasticsearch 6.x would need `ctx.payload.hits.total` instead. This version-specific detail is not called out in the post.

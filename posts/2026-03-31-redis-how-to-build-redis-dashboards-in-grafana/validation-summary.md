# Validation Summary: How to Build Redis Dashboards in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Grafana (dashboards, alerting, variables, API)
- Prometheus (PromQL queries)
- redis_exporter (oliver006/redis_exporter)
- Python (requests library for Grafana API)

## Sources Consulted
- Grafana dashboard JSON model documentation (https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/)
- Grafana panel field configuration and thresholds documentation (https://grafana.com/docs/grafana/latest/panels-visualizations/configure-thresholds/)
- Prometheus PromQL documentation on `rate()` function (https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- oliver006/redis_exporter metrics documentation (https://github.com/oliver006/redis_exporter)
- Grafana legacy vs unified alerting documentation (https://grafana.com/docs/grafana/latest/alerting/)
- Grafana community dashboard ID 763 (https://grafana.com/grafana/dashboards/763)

## Issues Found

1. **Stat panel thresholds in wrong JSON location**: The programmatic dashboard JSON example placed the stat panel's thresholds under `options.thresholds.steps`. In Grafana 8+, all panel types use `fieldConfig.defaults.thresholds.steps` for threshold configuration. Moved the thresholds to the correct location to match the gauge panel's structure.

2. **Legacy alert condition threshold mismatch**: The legacy alert condition used `IS BELOW 0.85`, but the panel's PromQL query multiplies by 100 to return a percentage (0-100 range). Changed the threshold from `0.85` to `85` to match the query's output scale.

3. **`rate()` used on gauge metric `redis_slowlog_length`**: The `rate()` function is designed for monotonically increasing counter metrics. `redis_slowlog_length` is a gauge representing the current number of entries in the slow log buffer (capped at the `slowlog-max-len` setting, default 128). Using `rate()` on a gauge produces misleading results. Changed to display the raw `redis_slowlog_length` gauge directly, which correctly shows slow query accumulation.

## Review Notes
- The `redis_replication_lag_seconds` metric name (Panel 7) is not a standard metric from oliver006/redis_exporter. The standard exporter exposes `redis_connected_slave_lag_seconds` (from the master's perspective) or `redis_master_last_io_seconds_ago` (from the replica's perspective). However, many deployments create recording rules with custom names, so this was noted but not changed.
- The legacy alerting instructions (Alert tab in panel editor) describe Grafana's legacy alerting system, which was removed in Grafana 11. The post does separately cover Grafana 9+ unified alerting, which is current.
- The `redis_memory_used_bytes / redis_memory_max_bytes * 100` query will return NaN/Inf if `maxmemory` is not configured (defaults to 0). This is a known operational caveat but not a code error.
- Dashboard ID 763 is a valid and well-known community Redis dashboard on Grafana.com.
- The Grafana API endpoint `/api/dashboards/db` and the Python code using it are correct.

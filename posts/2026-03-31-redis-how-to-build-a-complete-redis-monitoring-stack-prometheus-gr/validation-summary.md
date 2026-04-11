# Validation Summary: How to Build a Complete Redis Monitoring Stack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- redis_exporter (oliver006/redis_exporter v1.55.0)
- Prometheus
- Grafana
- Alertmanager
- systemd

## Sources Consulted
- oliver006/redis_exporter source code on GitHub (exporter/exporter.go metric definitions) — https://github.com/oliver006/redis_exporter
- Prometheus alerting rules documentation — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus configuration documentation — https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Alertmanager configuration documentation — https://prometheus.io/docs/alerting/latest/configuration/
- Grafana Dashboard Import HTTP API documentation — https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Grafana.com API for community dashboards — https://grafana.com/api/dashboards/763

## Issues Found

1. **Incorrect metric name `redis_replication_lag_seconds`** (alert rules and key metrics section): The metric `redis_replication_lag_seconds` does not exist in redis_exporter. The correct metric exposed by redis_exporter is `redis_connected_slave_lag_seconds` (with labels `slave_ip`, `slave_port`, `slave_state`). Fixed both occurrences — in the RedisHighReplicationLag alert rule expression and in the "Key Metrics to Dashboard" reference section.

2. **Invalid Grafana dashboard import API call**: The API call used `"path": "grafana_763.json"` which is not a valid way to import a grafana.com community dashboard. The `path` field in the Grafana import API is only for plugin-bundled dashboards. The `dashboard` field also only contained `{"id": null}` instead of the actual dashboard JSON. Fixed by replacing with a command that fetches the dashboard JSON from the grafana.com API (`https://grafana.com/api/dashboards/763`) and pipes it into the import request.

## Review Notes
- The Alertmanager `match` routing directive used in the config is deprecated in Alertmanager v0.22+ in favor of `matchers`. It still works for backward compatibility but new setups should prefer `matchers` syntax.
- The `RedisHighMemory` alert expression (`redis_memory_used_bytes / redis_memory_max_bytes * 100 > 85`) will produce `+Inf` or `NaN` if `maxmemory` is not configured in Redis (defaults to 0). A production setup should guard against this, e.g., by adding `and redis_memory_max_bytes > 0` to the expression.
- The Grafana datasource API call uses basic auth credentials (`admin:admin`) in the URL, which is fine for a tutorial but should be noted as insecure for production use.
- Dashboard ID 763 on grafana.com is a well-known Redis dashboard that works with redis_exporter metrics.

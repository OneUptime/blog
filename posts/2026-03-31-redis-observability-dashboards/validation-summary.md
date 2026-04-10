# Validation Summary: How to Build Redis Observability Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7
- Prometheus
- Grafana
- oliver006/redis_exporter
- Docker Compose

## Sources Consulted
- oliver006/redis_exporter GitHub repository and metric documentation: https://github.com/oliver006/redis_exporter
- Redis INFO command documentation: https://redis.io/commands/info
- Grafana HTTP API - Dashboard Import: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/#import-dashboard
- Grafana.com Dashboard 763 (Redis Dashboard for Prometheus Redis Exporter 1.x): https://grafana.com/grafana/dashboards/763
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Redis notify-keyspace-events documentation: https://redis.io/docs/manual/keyspace-notifications/

## Issues Found

### Issue 1: Incorrect replication metric names (Panel 5)
- **What was wrong:** The Replication Lag panel used `redis_replication_offset` and `redis_slave_replication_offset`, which are not valid redis_exporter metric names.
- **What was changed:** Replaced with the correct metric names `redis_master_repl_offset` and `redis_slave_repl_offset` as exported by oliver006/redis_exporter.
- **Why:** The redis_exporter derives these from Redis INFO replication output, using the shorter `repl_offset` suffix convention rather than `replication_offset`.

### Issue 2: Incorrect latency metric names (Panel 6)
- **What was wrong:** The Latency panel used `redis_commands_duration_seconds_sum` and `redis_commands_duration_seconds_count`, which are histogram/summary-style suffixes that do not match the actual redis_exporter metrics.
- **What was changed:** Replaced with the correct counter metric names `redis_commands_duration_seconds_total` and `redis_commands_total` as exported by redis_exporter from Redis INFO commandstats.
- **Why:** The redis_exporter exports command statistics as Prometheus counters with the `_total` suffix, not as histogram/summary metrics with `_sum`/`_count` suffixes.

### Issue 3: Incorrect Grafana dashboard import API payload
- **What was wrong:** The curl command used `{"pluginId":"grafana-dashboards-grafana","path":"","folderId":0,"dashboard":{"id":763}}` which is not the correct format for importing a dashboard from grafana.com.
- **What was changed:** Replaced with the correct format using `gnetId` at the top level along with the required `inputs` array for datasource mapping: `{"gnetId":763,"overwrite":true,"inputs":[{"name":"DS_PROMETHEUS","type":"datasource","pluginId":"prometheus","value":"Prometheus"}],"folderId":0}`.
- **Why:** The Grafana /api/dashboards/import endpoint expects `gnetId` as a top-level field for grafana.com dashboard imports, not a nested `dashboard.id`.

## Review Notes
- The `version: "3.8"` field in docker-compose.yml is deprecated in Docker Compose v2+ but still functional and widely used. Not changed since it does not cause errors.
- The `redis_connected_slaves` metric name used in the alert is correct but note that Redis 7 renamed the concept from "slave" to "replica" in user-facing documentation; however, redis_exporter still uses the legacy metric name for backward compatibility.
- Dashboard 763 and 11835 are both real community dashboards on grafana.com for Redis monitoring.
- The keyspace notification flags `KExg` are all valid flags for `notify-keyspace-events`.

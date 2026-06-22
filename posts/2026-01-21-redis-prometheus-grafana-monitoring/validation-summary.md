# Validation Summary: How to Monitor Redis with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- redis_exporter
- Prometheus
- PromQL
- Grafana dashboards and alert provisioning
- Docker and Docker Compose
- Kubernetes ServiceMonitor
- Python redis-py and prometheus_client

## Sources Consulted
- redis_exporter README and current metric/flag documentation: https://github.com/oliver006/redis_exporter
- redis_exporter current source metric mappings: https://raw.githubusercontent.com/oliver006/redis_exporter/master/exporter/exporter.go
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The Docker Compose and Prometheus examples referenced `/etc/prometheus/rules/*.yml` and `alertmanager:9093`, but the Compose file did not mount a rules directory or define an Alertmanager service. Added a `./rules:/etc/prometheus/rules` mount and an `alertmanager` service so the shown configuration is usable.
- The Kubernetes `ServiceMonitor` used `port: "9121"` without a named Service port. `ServiceMonitor.spec.endpoints.port` refers to the Service port name, so the Service port is now named `metrics` and the ServiceMonitor references `port: metrics`.
- The memory fragmentation metric was listed as `redis_memory_fragmentation_ratio`, but redis_exporter exposes `redis_mem_fragmentation_ratio`. Updated the metric table, PromQL query, and alert rule.
- The Grafana dashboard hit-rate panel used lifetime counters directly. Updated it to use `rate(...[5m])`, matching the later recommended cache hit ratio query and producing a current hit-rate percentage.
- The average command latency query divided per-command duration series by a total command counter without matching labels correctly. Updated it to `sum by (instance) (rate(redis_commands_duration_seconds_total[1m])) / rate(redis_commands_processed_total[1m])`.
- The AOF rewrite failure alert used non-existent `redis_aof_last_rewrite_status`. redis_exporter exposes `redis_aof_last_bgrewrite_status`, so the alert was corrected.
- The Python monitoring script divided by Redis `maxmemory` without handling the Redis default value of `0` for no memory limit. Added a guard so the warning only evaluates when `maxmemory > 0`.

## Review Notes
- JSON, YAML, and Python fenced snippets were parsed locally after edits.
- `promtool` was not installed locally, so Prometheus rule validation was reviewed against documentation and exporter metric mappings rather than executed with `promtool`.

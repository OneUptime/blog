# Validation Summary: How to Monitor Redis with RedisInsight and Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- RedisInsight
- Docker and Docker Compose
- Prometheus
- Redis exporter
- Grafana
- PromQL alert rules
- Python, redis-py, and Flask

## Sources Consulted
- RedisInsight Docker installation: https://redis.io/docs/latest/operate/redisinsight/install/install-on-docker/
- RedisInsight desktop installation: https://redis.io/docs/latest/operate/redisinsight/install/install-on-desktop/
- Homebrew Redis Insight cask: https://formulae.brew.sh/cask/redis-insight
- Redis INFO command reference: https://redis.io/docs/latest/commands/info/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Redis exporter README and configuration reference: https://github.com/oliver006/redis_exporter
- Redis exporter metric definitions: https://github.com/oliver006/redis_exporter/blob/master/exporter/exporter.go
- Redis exporter INFO metric extraction: https://github.com/oliver006/redis_exporter/blob/master/exporter/info.go
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Grafana alerting provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana-managed alert rules documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/

## Issues Found
- The macOS RedisInsight Homebrew command used `brew install redis/tap/redisinsight`, which is not the current Homebrew cask. Changed it to `brew install --cask redis-insight` and removed the unsupported `redisinsight` terminal start command in favor of launching the desktop app.
- Memory usage PromQL divided by `redis_memory_max_bytes` without accounting for Redis' default `maxmemory` value of `0`. Added `redis_memory_max_bytes > 0` filters to avoid misleading infinite values.
- The no-replica alert applied to every Redis instance, which would incorrectly alert for standalone Redis instances. Scoped it to masters using `redis_instance_info{role="master"}`.
- Grafana dashboard examples used the legacy `graph` panel type. Updated those panels to `timeseries`.
- The hit-rate query was labeled as a percentage but returned a 0-1 ratio. Multiplied the expression by 100.
- The Python keyspace counter assumed exactly 16 Redis databases. Updated it to count the database entries returned by Redis INFO, so it works with non-default database counts.
- The Python slowlog example sliced the first five characters/items from `entry['command']`, which could truncate commands incorrectly. Returned the command field as provided by redis-py.
- The "Grafana alert rules" YAML was not valid Grafana file provisioning syntax. Replaced it with valid Prometheus alert-rule YAML and clarified that the rules can be routed to Grafana or Alertmanager.

## Review Notes
- Redis exporter still uses metric names such as `redis_connected_slaves` and `redis_connected_slave_lag_seconds`; these are technically correct even though Redis terminology increasingly uses "replica".
- Redis exporter exposes `redis_memory_max_bytes` as `0` when no `maxmemory` limit is configured, so dashboards should treat memory percentage panels as unavailable unless a memory limit is set.
- The Docker Compose `version: '3.8'` key is accepted by many Compose installations but is considered obsolete by the current Compose Specification; it was left unchanged because it does not make the example nonfunctional.

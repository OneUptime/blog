# Validation Summary: How to Monitor Redis Sentinel Failover Events, Quorum Status, and Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Redis Sentinel
- Redis replication
- OpenTelemetry Collector
- OpenTelemetry Collector Redis receiver
- OpenTelemetry Collector filelog receiver
- redis-py
- Docker Compose

## Sources Consulted
- OpenTelemetry Collector Contrib Redis receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/redisreceiver
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver
- OpenTelemetry Collector Stanza filter operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/filter.md
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel commands documentation: https://redis.io/docs/latest/commands/?group=sentinel
- redis-py Sentinel command implementation: https://github.com/redis/redis-py/blob/master/redis/commands/sentinel.py
- Redis example configuration for replication directive naming: https://github.com/redis/redis/blob/unstable/redis.conf

## Issues Found
- The Redis receiver password example used `${REDIS_PASSWORD}`. Updated it to `${env:REDIS_PASSWORD}`, which matches the current OpenTelemetry Collector environment variable syntax documented by the Redis receiver.
- The text said the Python script would send metrics to the Collector, but the script only prints JSON. Updated the wording to say the script can print or export the collected values.
- The redis-py `sentinel_get_master_addr_by_name()` call was used as though it returned an address tuple by default. In current redis-py, it returns the response only when `return_responses=True`; otherwise it returns a success boolean. Updated the call and added handling for a missing address.
- The Redis client did not set `decode_responses=True`, which could make dictionary keys and values awkward to use in the example. Added `decode_responses=True` for string responses.
- The exception handling for the Sentinel lookup only caught `ConnectionError`. Broadened it to `RedisError` so Sentinel command errors are handled consistently in the reachability metric.
- The filelog filter expression matched important failover events directly. The Stanza filter operator drops entries that match its expression, so this would discard the events the post intended to keep. Inverted the expression so non-matching log lines are dropped.
- The Sentinel-down alert used `redis.uptime == 0`, but a down Sentinel normally stops reporting the metric rather than reporting zero. Reworded the condition to alert on missing `redis.uptime` for a Sentinel instance.
- The quorum-risk alert relied on a concrete `instance` label pattern that is backend-specific and not guaranteed by the Collector snippet. Reworded the condition as counting Sentinel instances that report `redis.uptime`.
- The Docker Compose example used the deprecated `--slaveof` replication option. Updated it to `--replicaof`.
- The Docker Compose example configured three Sentinel receivers but only defined one Sentinel service. Added `sentinel-2` and `sentinel-3` services to match the monitoring configuration.
- The Sentinel Compose example mounted the same `sentinel.conf` path for each Sentinel. Sentinel rewrites its configuration, so each Sentinel should have its own config file. Updated the volume examples to `sentinel-1.conf`, `sentinel-2.conf`, and `sentinel-3.conf`.
- The Sentinel configuration used the Docker service hostname `redis-master` without enabling Sentinel hostname resolution. Added `sentinel resolve-hostnames yes`, as Redis Sentinel only accepts hostnames when this setting is enabled.

## Review Notes
- The alert condition examples remain backend-neutral pseudocode, not Prometheus-ready rules. A production implementation should adapt metric labels and absent-series behavior to the chosen backend.
- The Redis receiver collects Redis INFO-derived metrics from the Sentinel process. Quorum and failover state still require Sentinel commands or logs, as shown in the post.

# Validation Summary: How to Monitor Redis Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis
- Redis CLI
- redis-py
- Prometheus
- redis_exporter
- Grafana
- Docker Compose
- Python

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis SLOWLOG GET command documentation: https://redis.io/docs/latest/commands/slowlog-get/
- Redis MONITOR command documentation: https://redis.io/docs/latest/commands/monitor/
- Redis CLIENT LIST command documentation: https://redis.io/docs/latest/commands/client-list/
- Redis Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py command implementation: https://github.com/redis/redis-py
- oliver006/redis_exporter README and source: https://github.com/oliver006/redis_exporter
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
1. The Prometheus and Grafana cache hit rate examples divided raw cumulative counters. This reports lifetime hit rate and can hide current cache behavior in dashboards and alerts. Changed those examples to use `rate(redis_keyspace_hits_total[5m])` and `rate(redis_keyspace_misses_total[5m])`.
2. The memory usage percentage examples divided by `redis_memory_max_bytes` without handling the valid Redis case where no `maxmemory` limit is configured. redis_exporter documents `redis_memory_max_bytes` as `0` in that case. Added a PromQL guard so the expressions only evaluate when `redis_memory_max_bytes > 0`.

## Review Notes
- Redis INFO output still uses legacy field names such as `connected_slaves` and `slave_repl_offset`; these are accurate and retained for compatibility even though current Redis terminology prefers "replica."
- The local environment did not have `redis-cli` or the `redis` Python package installed, so command behavior and APIs were verified against official Redis documentation, redis-py source, and redis_exporter source instead of local execution.

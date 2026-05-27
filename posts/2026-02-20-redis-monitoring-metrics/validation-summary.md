# Validation Summary: How to Monitor Redis Performance and Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Open Source
- Redis INFO command
- Redis Slow Log
- redis-py
- Prometheus
- redis_exporter
- Docker Compose

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis SLOWLOG documentation: https://redis.io/docs/latest/commands/slowlog/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py command source documentation for slowlog_get: https://redis.readthedocs.io/en/v5.2.1/_modules/redis/commands/core.html
- redis_exporter README: https://github.com/oliver006/redis_exporter
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Docker Compose file reference for the obsolete version property: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The `get_redis_metrics` helper used a module-level Redis client, while `redis_health_check` created its own client for the requested host and port. I changed `get_redis_metrics` to accept a `redis.Redis` client and updated the health check to pass its local client, so custom `host` and `port` arguments are honored.
- The Docker Compose example used the top-level `version: "3.8"` property. Docker Compose now treats this property as obsolete and informational, so I removed it from the snippet.
- The p99 latency calculation used `int(len(latencies) * 0.99)` as a zero-based index, which selects the maximum value for 100 samples instead of the nearest-rank p99. I changed it to use `ceil(n * 0.99) - 1` with bounds checking.
- The fragmentation warning said to restart Redis and stated that a fragmentation ratio below 1.0 means Redis is swapping to disk. Redis documentation is more precise: high RSS relative to used memory should be investigated with allocator metrics or `MEMORY DOCTOR`, and used memory greater than RSS means memory may have been swapped by the OS. I updated the warning text accordingly.
- Added `mem_fragmentation_bytes` to the collected memory metrics because Redis documentation notes that `mem_fragmentation_ratio` alone can be misleading when the absolute byte delta is small.

## Review Notes
The post's commands, Redis INFO section names, Redis slow log duration units, redis_exporter `REDIS_ADDR` setting, Prometheus scrape configuration, and Redis server options shown in the Docker Compose example are technically valid. The Python snippets were parsed successfully with Python's AST parser after the fixes. The local environment did not have `redis-server` or `redis-cli` installed, so CLI verification was performed against official documentation rather than local help output.

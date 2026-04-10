# Validation Summary: Redis Runbook: Handling Out of Memory Events

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Redis (commands: INFO, CONFIG SET, MEMORY USAGE, MEMORY DOCTOR, UNLINK, --bigkeys, --scan)
- Prometheus (alerting rules)
- redis_exporter (Prometheus metrics)

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/ — confirmed `rejected_connections` measures connections rejected due to `maxclients` limit, not OOM command rejections
- Redis DEL command documentation: https://redis.io/docs/latest/commands/del/ — confirmed DEL is synchronous and O(M) for non-string keys
- Redis UNLINK command documentation: https://redis.io/docs/latest/commands/unlink/ — confirmed UNLINK is async, available since Redis 4.0
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/ — confirmed human-readable memory units (e.g., `4gb`) are accepted
- Redis configuration file (redis.conf): https://github.com/redis/redis/blob/unstable/redis.conf — confirmed memory unit shorthand (1k, 1kb, 1m, 1mb, 1g, 1gb, case insensitive)

## Issues Found
1. **`rejected_connections` misidentified as OOM indicator (Step 1)**: The post said "Check if Redis is rejecting commands" and used `redis-cli INFO stats | grep "rejected_connections"`. The `rejected_connections` metric counts connections rejected due to the `maxclients` limit, not commands rejected due to OOM. Replaced with `redis-cli CONFIG GET maxmemory-policy` which checks the eviction policy — directly relevant because the `noeviction` policy causes write rejections during OOM.

2. **`DEL` used instead of `UNLINK` for large key deletion (Step 3)**: The post recommended `redis-cli DEL` for deleting large keys during an OOM event. `DEL` is synchronous and blocks the Redis server with O(M) complexity for non-string keys (where M = element count). During an OOM incident, blocking the server with a large key deletion can cause cascading failures. Changed to `UNLINK` which removes the key from the keyspace immediately but reclaims memory asynchronously in a background thread (available since Redis 4.0). Applied to both the direct deletion and the SCAN + xargs pattern.

3. **Wrong code block language for Prometheus alert (Step 7)**: The Prometheus alerting rule (YAML syntax) was in a `bash` code block. Changed to `yaml`.

## Review Notes
- The `CONFIG SET maxmemory 4gb` syntax is valid — Redis accepts human-readable memory shorthand (`1k`, `1kb`, `1m`, `1mb`, `1g`, `1gb`, case insensitive).
- The fragmentation ratio threshold of 1.5 is a reasonable heuristic, though there is no single canonical threshold in the Redis docs.
- The Prometheus metric names `redis_memory_used_bytes` and `redis_memory_max_bytes` are correct for the standard oliver006/redis_exporter.
- All other commands (`--bigkeys`, `INFO keyspace`, `MEMORY USAGE`, `MEMORY DOCTOR`, `CONFIG SET activedefrag yes`, etc.) are correct and current.
- The post assumes Redis 4.0+ features (MEMORY USAGE, MEMORY DOCTOR, UNLINK, active defragmentation, LFU eviction). This is reasonable given Redis 4.0 was released in 2017, but could be noted for readers on very old versions.

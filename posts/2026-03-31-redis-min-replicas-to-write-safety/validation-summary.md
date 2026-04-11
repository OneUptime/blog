# Validation Summary: How to Configure Redis min-replicas-to-write for Write Safety

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (server configuration, replication)
- Redis CLI (`CONFIG SET`, `CONFIG GET`, `INFO replication`)
- Python redis-py client library
- Redis Sentinel
- Redis Cluster

## Sources Consulted
- Redis official documentation on replication: https://redis.io/docs/management/replication/
- Redis official documentation on redis.conf directives (`min-replicas-to-write`, `min-replicas-max-lag`)
- Redis Sentinel documentation: https://redis.io/docs/management/sentinel/
- Redis WAIT command documentation: https://redis.io/commands/wait/
- redis-py library documentation and exception classes

## Issues Found

1. **Incorrect claim about write latency (Trade-offs section)**: The post stated that enabling `min-replicas-to-write` "increases write latency slightly (waiting for replication acknowledgment)." This is incorrect. The directive does not make writes wait for replication ACKs — the master checks a pre-computed state of recently-ACK'd replicas and either accepts or rejects the write immediately. No additional latency is added to accepted writes. The `WAIT` command is what provides synchronous replication with added latency. **Fixed** the bullet point to accurately describe the behavior: writes are not slowed but can fail suddenly when replicas fall behind.

2. **Misleading per-key suggestion (Trade-offs section)**: The post suggested "setting this directive only on keys that require durability, using Lua scripts or application logic." This is misleading because `min-replicas-to-write` is a server-level configuration and cannot be applied per-key. Lua scripts cannot bypass this restriction for specific keys. **Fixed** to recommend using separate Redis instances with different configurations for workloads needing mixed durability guarantees.

3. **Inaccurate Sentinel interaction claim (Interaction with Sentinel and Cluster section)**: The post claimed "Sentinel will trigger failover sooner" due to `min-replicas-to-write`. Sentinel's failover timing is governed by its own `down-after-milliseconds` configuration and does not observe write rejections from this directive. The real benefit is that an isolated primary stops accepting writes, reducing data divergence during the partition. **Fixed** to accurately describe the relationship between the directive and Sentinel.

## Review Notes
- The post correctly uses the modern `min-replicas-*` naming (Redis 5.0+). The older `min-slaves-*` aliases still work but are deprecated.
- The `INFO replication` output still uses `slave0`/`slave1`/`connected_slaves` field names, which is accurate — Redis kept these field names for backward compatibility even after the terminology change.
- The Python code example correctly uses `redis.exceptions.ResponseError` and string-checks for `NOREPLICAS`, which is the standard approach in redis-py.
- The characterization of Redis as "semi-synchronous" with this feature enabled is a reasonable simplification, though technically replication remains asynchronous — the feature only ensures replicas are connected and recently responsive.

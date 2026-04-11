# Validation Summary: How to Plan Redis Replication Based on Read Throughput

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Redis (replication, benchmarking, configuration)
- redis-benchmark CLI tool
- redis-cli CLI tool
- Python redis-py library (redis.Redis, redis.sentinel.Sentinel)
- Redis Sentinel
- Prometheus (alerting concept)

## Sources Consulted
- Redis official documentation on replication: https://redis.io/docs/management/replication/
- Redis official documentation on redis-benchmark: https://redis.io/docs/management/optimization/benchmarks/
- Redis configuration file reference (redis.conf): https://redis.io/docs/management/config/
- Redis MONITOR command documentation: https://redis.io/commands/monitor/
- Redis INFO command documentation: https://redis.io/commands/info/
- Redis REPLICAOF command documentation: https://redis.io/commands/replicaof/
- redis-py library documentation: https://redis-py.readthedocs.io/
- redis-py Sentinel documentation: https://redis-py.readthedocs.io/en/stable/connections.html#sentinel-client

## Issues Found
1. **Replica count calculation bug (Step 3)**: The `calculate_replicas_needed` function conflated "total nodes including primary" with "instances needed for read throughput." The variable `replicas_needed` was computed as the ceiling of read instances needed, but then `recommended_replicas = replicas_needed - 1` subtracted one for the primary, leaving insufficient replica count. With the example values (800K target, 487K capacity, 0.70 safety factor), the original code recommended 2 replicas providing only 681,800 reads/sec — short of the 800,000 target by 118,200 ops/sec. This was inconsistent with Step 5's code which routes reads only to replicas, not the primary.

   **Fix**: Replaced `int(x) + 1` rounding with `math.ceil()` to compute the replica count directly. Changed the return values so `recommended_replicas` is the count of read-serving replicas and `total_nodes` adds 1 for the primary. The corrected calculation recommends 3 replicas (1,022,700 read capacity) + 1 primary = 4 total nodes.

## Review Notes
- The `repl-backlog-size` and `repl-backlog-ttl` settings in the replica configuration section are technically valid but primarily affect the node when it acts as a source for other replicas (chained replication) or after promotion. The comment "Tune replica replication buffer" could be slightly misleading since the replication backlog is an outgoing buffer for connected downstream replicas, not an incoming buffer. This is not incorrect, just a nuance worth noting.
- The `itertools.cycle` with `next()` in the `ReadScaledRedis` class is not thread-safe. In a multi-threaded Python application, concurrent calls could cause issues. This is acceptable for a conceptual example but production code would need synchronization or per-thread cycling.
- The Prometheus metric name `redis_connected_slaves_lag_seconds` may vary depending on the Redis exporter version used. Common exporters use similar but not identical names.
- The `min-replicas-to-write 1` setting on the primary is technically correct but worth noting: it means the primary will refuse writes if all replicas are unavailable, which may not be desired in all read-scaling scenarios.
- All Redis configuration directives use current naming conventions (e.g., `replicaof` instead of deprecated `slaveof`, `replica-read-only` instead of `slave-read-only`).

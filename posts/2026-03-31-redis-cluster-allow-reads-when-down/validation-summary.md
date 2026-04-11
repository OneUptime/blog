# Validation Summary: How to Configure Redis cluster-allow-reads-when-down

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis Cluster (6.0+)
- Redis CLI (`redis-cli`)
- Python `redis-py` library (cluster support)

## Sources Consulted
- Official Redis `redis.conf` documentation for Redis 6.0 and 7.0
- Redis source code (`src/cluster.c`) for CLUSTERDOWN error handling and `cluster-allow-reads-when-down` logic
- Redis CLUSTER INFO command documentation (https://redis.io/commands/cluster-info/)
- `redis-py-cluster` GitHub repository (archived Jan 2024) — confirmed deprecated and merged into `redis-py` 4.1.0+
- `redis-py` documentation for `redis.cluster.RedisCluster` and `ClusterNode` API

## Issues Found
1. **Deprecated Python library**: The code example used `from rediscluster import RedisCluster` from the archived `redis-py-cluster` package. Updated to `from redis.cluster import RedisCluster, ClusterNode` using the modern `redis-py` (>= 4.1.0) library.
2. **Outdated startup_nodes format**: Changed from dictionaries with string ports (`{"host": "...", "port": "7000"}`) to `ClusterNode` objects with integer ports (`ClusterNode("...", 7000)`), matching the current `redis-py` API.
3. **Renamed parameter**: Replaced `skip_full_coverage_check=True` with `require_full_coverage=False`, the equivalent parameter in `redis-py` (inverted boolean semantics).
4. **Section header updated**: Changed "In Python with `redis-py-cluster`" to "In Python with `redis-py`" to reflect the current library name.

## Review Notes
- All Redis configuration claims (`cluster-allow-reads-when-down` default value, runtime CONFIG SET/GET, CLUSTERDOWN error text, cluster_state values, relationship with `cluster-require-full-coverage`) are accurate.
- The directive was introduced in Redis 6.0; the post does not specify a version, which is fine since 6.0+ is the current mainstream.
- The explanation of read-vs-write behavior when `cluster-allow-reads-when-down yes` is enabled is accurate — Redis source confirms write commands are rejected with a specific "only accepts read commands" error while reads for locally-owned slots proceed.

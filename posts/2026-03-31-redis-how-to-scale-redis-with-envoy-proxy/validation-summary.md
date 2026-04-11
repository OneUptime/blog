# Validation Summary: How to Scale Redis with Envoy Proxy

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis
- Envoy Proxy (redis_proxy network filter)
- Kubernetes (sidecar deployment pattern)
- YAML (Envoy and Kubernetes configuration)

## Sources Consulted
- Envoy Redis Proxy filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/redis_proxy_filter
- Envoy Redis Cluster extension: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/clusters/redis/v3/redis_cluster.proto
- Envoy RedisProxy v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/redis_proxy/v3/redis_proxy.proto
- Envoy Circuit Breakers configuration: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy Redis Proxy statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/redis_proxy_filter#statistics
- Docker Hub envoyproxy/envoy image tags

## Issues Found

### 1. Read/Write Splitting Section - Incorrect Cluster Type (Critical)
**What was wrong:** The read/write splitting example used `type: STRICT_DNS` clusters with `read_policy: REPLICA`. The `read_policy` setting only works with the `envoy.clusters.redis` cluster type, which discovers the Redis Cluster topology automatically via `CLUSTER SLOTS` commands. Additionally, a `redis_replica` cluster was defined but never referenced anywhere in the configuration (orphaned/dead config).

**What was changed:** Replaced the entire read/write splitting section to use a single cluster with `cluster_type: name: envoy.clusters.redis` and `RedisClusterConfig` typed_config including `cluster_refresh_rate` and `cluster_refresh_timeout`. Removed the orphaned `redis_replica` cluster and the unreferenced `redis_primary` cluster. Updated the section heading and description to clarify this requires Redis Cluster.

### 2. Monitoring Stats Names - Incorrect Prefix (Moderate)
**What was wrong:** The monitoring section showed stats like `redis.egress_redis.downstream_cx_total`, but the configuration uses `stat_prefix: redis`. With that prefix, the actual stat names are `redis.redis.*`, not `redis.egress_redis.*`. The `egress_redis` prefix comes from some Envoy examples that use a different stat_prefix value.

**What was changed:** Updated all stat name examples to use `redis.redis.*` to match the `stat_prefix: redis` setting, and added a clarifying comment about the naming pattern.

### 3. lb_policy: MAGLEV - Unusual Choice (Minor)
**What was wrong:** The basic configuration example used `lb_policy: MAGLEV`, which is a consistent-hashing algorithm typically used for HTTP session affinity. While technically valid, it is an unusual and misleading choice for a basic single-endpoint Redis proxy setup.

**What was changed:** Changed to `lb_policy: ROUND_ROBIN`, which is the conventional choice for basic Redis proxy configurations.

## Review Notes
- The `envoyproxy/envoy:v1.28-latest` Docker image tag is valid but references a specific minor version. Future readers may want to use a newer Envoy version.
- The circuit breakers configuration is correct but readers should note that `max_pending_requests` and `max_requests` thresholds are more relevant for HTTP traffic. For Redis proxy traffic, `max_connections` is the most impactful threshold.
- The post could benefit from mentioning that `read_policy: REPLICA` requires running an actual Redis Cluster (not standalone Redis or Sentinel), but this is a scope addition rather than a correction.

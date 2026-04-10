# Validation Summary: How to Monitor Redis with AppDynamics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (INFO command metrics, Jedis client library)
- AppDynamics Machine Agent and Machine Agent Extensions
- AppDynamics Java Agent (APM)
- AppDynamics Health Rules and Flow Map
- Java (Jedis Redis client)

## Sources Consulted
- AppDynamics Machine Agent documentation (controller-info.xml configuration elements)
- AppDynamics Redis Monitoring Extension (AppDynamics Exchange / GitHub: AppDynamics/redis-monitoring-extension)
- AppDynamics Java Agent system property reference (-Dappdynamics.agent.* and -Dappdynamics.controller.* flags)
- Redis INFO command documentation (metric field names: connected_clients, used_memory, used_memory_rss, keyspace_hits, keyspace_misses, evicted_keys, rejected_connections, instantaneous_ops_per_sec)
- Jedis API documentation (setex method signature)

## Issues Found
- **Incorrect byte-to-GB conversion in health rule example**: The original value `3000000000` was annotated as "(3GB in bytes)" but 3,000,000,000 bytes = ~2.79 GiB. Changed the value to `3221225472`, which is exactly 3 GiB (3 × 1,073,741,824 bytes), to match the comment.

## Review Notes
- The Redis Monitoring Extension `config.yml` format shown (with a `metrics` block listing individual INFO field names) may not match the exact format used by all versions of the official AppDynamics Redis Monitoring Extension. The official extension typically collects all Redis INFO metrics automatically and uses `metricSections` for filtering rather than individual metric names. However, the listed metrics are all valid Redis INFO fields and the overall concept is correct.
- The `controller-info.xml` omits `node-name`, which is acceptable for Machine Agent deployments — the agent will auto-generate a node name from the hostname.
- The Jedis code example is syntactically correct and idiomatic. The `setex(key, seconds, value)` call signature is correct.
- The AppDynamics Java Agent JVM system properties are all correctly named.
- The health rule and flow map UI navigation paths are accurate.

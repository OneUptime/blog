# Validation Summary: Top Redis Interview Questions for DevOps Engineers

## Status
validated

## Post Type
Reference / Interview preparation guide

## Technologies Covered
- Redis (server configuration, replication, Sentinel, Cluster)
- Redis CLI
- Redis TLS (Redis 6+)
- Kubernetes (Helm, StatefulSets, PersistentVolumeClaims)
- Bitnami Redis Helm chart

## Sources Consulted
- Redis official documentation — Security (https://redis.io/docs/latest/operate/oss_and_stack/management/security/)
- Redis official documentation — redis.conf directives (https://redis.io/docs/latest/operate/oss_and_stack/management/config/)
- Redis official documentation — TLS support (https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/)
- Redis official documentation — Replication (https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
- Redis official documentation — Sentinel (https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)
- Redis official documentation — Cluster specification (https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- Redis official documentation — INFO command (https://redis.io/docs/latest/commands/info/)
- Bitnami Redis Helm chart documentation (https://github.com/bitnami/charts/tree/main/bitnami/redis)

## Issues Found
1. **`keyspace_hit_rate` presented as a Redis metric name (line 94):** The post listed `keyspace_hit_rate` in backticks as if it were an actual Redis INFO field. Redis does not expose a field by that name; it reports `keyspace_hits` and `keyspace_misses` separately, and the hit rate must be calculated. Fixed to: "Hit rate (`keyspace_hits / (keyspace_hits + keyspace_misses)`) should be above 95%".

## Review Notes
- The `rename-command` directive (used in the security section) is deprecated in Redis 7.0+ in favor of ACLs. It still functions, and the post correctly demonstrates its usage, but future readers on Redis 7+ should prefer ACL-based command restrictions. This is not an error in the post since no specific version is claimed for that section.
- The Sentinel `failover-timeout` is set to 10000ms (10 seconds), which is much lower than the default of 180000ms (3 minutes). This is a valid configuration but aggressive for production. As an interview example it is fine.

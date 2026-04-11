# Validation Summary: How to Configure Redis cluster-enabled and Cluster Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis Cluster
- Redis CLI (`redis-cli`, `redis-server`)
- Redis configuration (`redis.conf`)

## Sources Consulted
- [Scale with Redis Cluster (redis.io)](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- [Redis Cluster Specification (redis.io)](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- [CLUSTER INFO Command (redis.io)](https://redis.io/docs/latest/commands/cluster-info/)
- [Redis source: config.c (GitHub)](https://github.com/redis/redis/blob/unstable/src/config.c)
- [Redis default redis.conf (GitHub)](https://github.com/redis/redis/blob/unstable/redis.conf)

## Issues Found
- **Incorrect `CLUSTER INFO` output field**: The example output for `CLUSTER INFO` included `cluster_enabled:1`. This field is not part of the `CLUSTER INFO` command output — it belongs to the `INFO cluster` command output instead. Removed `cluster_enabled:1` from the example output block.

## Review Notes
- All configuration directives (`cluster-enabled`, `cluster-config-file`, `cluster-node-timeout`, `cluster-announce-ip`, `cluster-announce-port`, `cluster-announce-bus-port`, `cluster-require-full-coverage`, `cluster-allow-reads-when-down`) are valid and correctly described.
- The default values stated (15000ms for timeout, `yes` for full-coverage, `no` for allow-reads-when-down) are all accurate.
- The 16384 hash slot count is correct per the Redis Cluster specification.
- The `redis-cli --cluster create` command with `--cluster-replicas 1` and 6 nodes correctly produces 3 primaries + 3 replicas, matching official documentation examples.
- The claim that `cluster-enabled` cannot be changed at runtime is correct — it is flagged as `IMMUTABLE_CONFIG` in the Redis source.
- The claim that `cluster-node-timeout` can be changed at runtime via `CONFIG SET` is correct — it is flagged as `MODIFIABLE_CONFIG`.
- The bus port offset of 10000 (6379 → 16379) is correct per the cluster specification.

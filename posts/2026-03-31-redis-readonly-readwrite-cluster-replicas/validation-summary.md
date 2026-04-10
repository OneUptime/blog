# Validation Summary: How to Use READONLY and READWRITE in Redis Cluster Replicas

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis Cluster (READONLY and READWRITE commands)
- redis-cli (cluster mode)
- Python redis-py client library (RedisCluster)

## Sources Consulted
- Redis official documentation for READONLY command: https://redis.io/docs/latest/commands/readonly/
- Redis official documentation for READWRITE command: https://redis.io/docs/latest/commands/readwrite/
- Redis Cluster specification (MOVED redirection, replica behavior): https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- redis-cli source code (redis-cli.c) for CLI flag verification
- redis-py source code and clustering documentation (redis/cluster.py on GitHub)

## Issues Found

### 1. Non-existent `redis-cli --readonly` flag
- **What was wrong:** The section "Using READONLY with redis-cli --cluster" claimed that `redis-cli` supports a `--readonly` command-line flag (`redis-cli -c -p 7004 --readonly`). This flag does not exist in redis-cli. The `sendReadOnly()` function in redis-cli.c is only used internally for diagnostic commands like `--bigkeys` and `--memkeys`, not exposed as a user-facing `--readonly` option.
- **What was changed:** Replaced the incorrect command with the correct approach: connect in cluster mode with `redis-cli -c -p 7004` and then manually issue the `READONLY` command. Also corrected the section title from "Using READONLY with redis-cli --cluster" to "Using READONLY with redis-cli in Cluster Mode" since `--cluster` is a separate redis-cli subcommand for cluster management operations, not the `-c` cluster mode flag.
- **Why:** Running `redis-cli -c -p 7004 --readonly` would produce an unrecognized option error, misleading readers.

## Review Notes
- The `read_from_replicas` parameter in the Python redis-py `RedisCluster` example is functional but deprecated in recent versions of redis-py. The newer API uses `load_balancing_strategy` (e.g., `LoadBalancingStrategy.ROUND_ROBIN`). The existing code still works, so it was not changed, but readers using the latest redis-py versions may see deprecation warnings.
- The MOVED error example (`MOVED 4821 127.0.0.1:7001`) uses a plausible hash slot number (Redis Cluster uses slots 0-16383) and the correct error format confirmed by the cluster specification.
- All other technical claims (per-connection READONLY scope, default replica redirect behavior, eventual consistency trade-off) are accurate per official Redis documentation.

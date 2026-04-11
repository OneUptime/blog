# Validation Summary: How to Troubleshoot Redis READONLY Errors on Replicas

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis (replication, Sentinel, Cluster)
- Python redis-py (Sentinel and Cluster clients)
- Node.js ioredis
- redis-cli

## Sources Consulted
- Redis ROLE command documentation: https://redis.io/docs/latest/commands/role/
- Redis READONLY command documentation: https://redis.io/docs/latest/commands/readonly/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- redis-py Sentinel API: https://redis-py.readthedocs.io/en/stable/connections.html#sentinel
- redis-py RedisCluster API: https://redis-py.readthedocs.io/en/stable/clustering.html
- ioredis documentation: https://github.com/redis/ioredis

## Issues Found
- **Step 6 - Separate redis-cli invocations for READONLY**: The original post showed two separate `redis-cli` shell commands to demonstrate the READONLY command in cluster mode. Since each `redis-cli` invocation creates a new TCP connection, the READONLY state from the first command would not carry over to the second. Fixed by showing an interactive `redis-cli` session where both commands run on the same connection.

## Review Notes
- The Python Sentinel example uses `sentinel.slave_for()` which is the current method name in redis-py. While the Redis project has moved toward "replica" terminology, redis-py still uses `slave_for` as the primary method name.
- Writes to replicas with `replica-read-only no` are local-only and will be lost on the next full resync from the primary. The post correctly warns about this but readers should be aware the data loss can happen silently during resyncs.
- The `replica-read-only` config directive was renamed from `slave-read-only` in Redis 5.0. The post correctly mentions both names for backward compatibility.

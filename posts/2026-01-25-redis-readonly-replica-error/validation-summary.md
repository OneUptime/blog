# Validation Summary: How to Fix 'READONLY You can't write against a read only replica'

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Redis replication
- Redis Sentinel
- Redis Cluster
- redis-py
- redis-cli
- Redis configuration

## Sources Consulted
- Redis official replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis official Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis official INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis official ROLE command documentation: https://redis.io/docs/latest/commands/role/
- Redis official CONFIG SET command documentation: https://redis.io/docs/latest/commands/config-set/
- Redis official REPLICAOF command documentation: https://redis.io/docs/latest/commands/replicaof/
- redis-py official connection, Sentinel, and RedisCluster documentation: https://redis.readthedocs.io/en/stable/connections.html

## Issues Found
- The "Temporary Write to Replica" section listed "Promoting a replica manually" as a use case for `CONFIG SET replica-read-only no`. That is misleading: `replica-read-only` only controls whether a replica accepts local writes. Manual promotion is done with `REPLICAOF NO ONE`. Changed the bullet to refer to intentionally local-only recovery writes and added a sentence pointing manual promotion to `REPLICAOF NO ONE`.

## Review Notes
- Redis still reports `role:slave` and fields such as `connected_slaves` / `slave_read_only` in `INFO replication` for compatibility, so the examples are technically correct despite Redis documentation generally preferring "replica" terminology.
- The redis-py Sentinel examples use `slave_for()`, which remains documented and valid in the current redis-py docs.
- The RedisCluster `read_from_replicas=True` option is present in current redis-py documentation and is valid for routing eligible reads to replicas.

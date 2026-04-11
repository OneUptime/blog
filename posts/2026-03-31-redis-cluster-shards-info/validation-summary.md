# Validation Summary: How to Use CLUSTER SHARDS in Redis to Get Shard Information

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis 7.0+ (CLUSTER SHARDS command)
- Redis Cluster architecture (shards, slots, replication)
- Python redis-py client library
- redis-cli

## Sources Consulted
- Official Redis CLUSTER SHARDS documentation: https://redis.io/docs/latest/commands/cluster-shards/
- Official Redis CLUSTER SLOTS documentation: https://redis.io/docs/latest/commands/cluster-slots/

## Issues Found
1. **Missing node-level fields in Field Reference table**: The node-level fields table omitted `tls-port` and `hostname`, which are both part of the CLUSTER SHARDS response per official Redis documentation. `tls-port` is an optional field (at least one of `port` or `tls-port` is always present), and `hostname` is an optional announced hostname. Added both fields to the table.

## Review Notes
- All other technical claims are accurate: CLUSTER SHARDS was introduced in Redis 7.0.0, CLUSTER SLOTS was available since Redis 3.0.0 and deprecated in Redis 7.0.0, health values are correctly listed as `online`, `failed`, and `loading`, and role values are correctly `master` and `replica`.
- The sample output is illustrative and does not include every optional field, which is acceptable.
- The Python example uses `redis.RedisCluster` with `execute_command('CLUSTER SHARDS')`, which is a valid approach with the redis-py library.
- The bash grep example (`redis-cli -p 7001 CLUSTER SHARDS | grep -A 1 '"health"'`) may not match exactly depending on redis-cli output formatting (strings may or may not be quoted), but is reasonable as an illustrative example.
- The `endpoint` field has additional special values (NULL, empty string, "?") for misconfigured nodes that are not mentioned, but omitting them is acceptable for a general overview post.

# Validation Summary: How Redis Cluster Bus Communication Works

## Status
validated

## Post Type
Technical guide / Reference

## Technologies Covered
- Redis Cluster (7.0+)
- Redis Cluster Bus protocol (gossip, failure detection)
- Linux networking tools (ss, telnet, ufw)

## Sources Consulted
- Official Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis CLUSTER LINKS documentation: https://redis.io/commands/cluster-links/
- Redis CLUSTER INFO documentation: https://redis.io/commands/cluster-info/
- Redis source code (cluster.h, cluster.c) for message type definitions
- Antirez's explanation of 16384 slot choice: https://github.com/redis/redis/issues/2576

## Issues Found

1. **MFEND does not exist as a cluster bus message type.** The post listed "MFSTART/MFEND" as manual failover coordination messages. Only `CLUSTERMSG_TYPE_MFSTART` (type 8) exists in Redis. There is no MFEND message — the end of manual failover is handled through the normal FAILOVER_AUTH_REQUEST/ACK flow. Fixed by removing "/MFEND" from the list.

2. **Heartbeat message size claim was incorrect.** The post stated "the slot bitmap fits in 2048 bytes, keeping heartbeat messages under 2KB." This is self-contradictory: 2048 bytes IS 2KB, and the full cluster message header (including the bitmap, sender node ID, config epoch, IP/port, etc.) is approximately 2,256 bytes before gossip entries. The total PING/PONG message is well over 2KB. Fixed to accurately state that the bitmap is 2KB and that this keeps the header compact, contrasting with the 8KB that 65536 slots would require.

3. **Cluster bus port offset is configurable since Redis 7.0.** The post presented the +10000 offset as a fixed rule. Since Redis 7.0, the `cluster-port` configuration parameter allows overriding this default. Added a note about this since the post already references Redis 7.0 features.

## Review Notes
- The list of cluster bus message types omits FAILOVER_AUTH_REQUEST, FAILOVER_AUTH_ACK, MODULE, and PUBLISHSHARD (added in 7.0 for sharded Pub/Sub). The list doesn't claim to be exhaustive, so this is acceptable, but could be expanded in a future revision.
- The gossip section claim of "up to 1/10th of known nodes" is accurate but has a minimum of 3 nodes per the implementation — small clusters will gossip about more than 1/10th.
- The `CLUSTER LINKS` output format, `cluster-link-sendbuf-limit` config (including both "8mb" and raw byte formats), and `total_cluster_links_buffer_limit_exceeded` metric are all verified correct for Redis 7.0+.

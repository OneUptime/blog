# Validation Summary: How to Use CLUSTER LINKS in Redis to View Inter-Node Connections

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis 7.0+
- Redis Cluster
- CLUSTER LINKS command
- Redis CLI (redis-cli)

## Sources Consulted
- Official Redis CLUSTER LINKS documentation: https://redis.io/docs/latest/commands/cluster-links/
- Official Redis CLUSTER INFO documentation: https://redis.io/docs/latest/commands/cluster-info/
- Official Redis CLUSTER NODES documentation: https://redis.io/docs/latest/commands/cluster-nodes/

## Issues Found
1. **`create-time` field description was slightly imprecise.** The post described it as "Timestamp when the connection was established (milliseconds)." The official Redis documentation clarifies that for outbound (`to`) links, this is the time the TCP link was *created* (initiated), not when it was *established* (completed). This distinction matters for network diagnostics. Updated the description to: "Timestamp when the connection was created (milliseconds). For outbound (`to`) links, this is when the TCP link was initiated, not when it was fully established."

## Review Notes
- The command was introduced in Redis Open Source 7.0.0. The post says "Redis 7.0" which is accurate (just omits the patch version).
- All six fields documented (direction, node, create-time, events, send-buffer-allocated, send-buffer-used) match the official Redis documentation exactly.
- Each cluster node maintains a *pair* of TCP connections with every peer (one outbound `to`, one inbound `from`), so for N cluster nodes each node will list 2*(N-1) links. The post doesn't explicitly mention this, but the example script's `EXPECTED_LINKS=10` is consistent with a 6-node cluster (2*5=10), which is reasonable.
- The CLUSTER LINKS command is not available on Redis Cloud or Redis Software managed services. The post doesn't mention this, which is acceptable for a general tutorial but worth noting for readers using managed Redis.
- Time complexity is O(N) where N is the total number of cluster nodes.

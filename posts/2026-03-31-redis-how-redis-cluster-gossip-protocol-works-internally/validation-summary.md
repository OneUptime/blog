# Validation Summary: How Redis Cluster Gossip Protocol Works Internally

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- Redis Cluster
- Gossip protocol (epidemic protocol)
- Distributed systems failure detection
- Redis cluster bus (node-to-node communication)

## Sources Consulted
- Redis Cluster Specification: https://redis.io/docs/reference/cluster-spec/
- Redis Cluster Tutorial: https://redis.io/docs/management/scaling/
- Redis source code (`cluster.c`) for PING node selection logic and failure detection mechanics
- Redis configuration documentation for `cluster-migration-barrier`, `cluster-node-timeout`

## Issues Found

1. **Incorrect reference to `cluster-migration-barrier` in PING cycle description**: The post stated "Select up to cluster-migration-barrier nodes to PING". The `cluster-migration-barrier` config controls replica migration (minimum number of replicas a master must retain before one can migrate to an orphaned master) and has nothing to do with PING selection. Fixed to describe the actual mechanism: Redis picks 5 random nodes and PINGs the one with the oldest `pong_received` timestamp, plus always PINGs nodes not heard from in over `node-timeout/2`.

2. **Incorrect Node ID size description**: The post described the Node ID as a "40-byte hex string". It is actually a 40-character hex string (representing 20 bytes / 160 bits, generated from a SHA1-like random ID). Changed "40-byte" to "40-character".

3. **Misleading FAIL timeout comment**: The post stated "After 2 * node-timeout, cluster gives up and marks FAIL", implying FAIL is purely time-based. In reality, FAIL requires a majority of master nodes to independently report the target as PFAIL within a `2 * node-timeout` validity window. It is consensus-based, not a simple timeout. Fixed the comment to reflect the majority agreement requirement.

## Review Notes
- The `CLUSTER SLOTS` command shown is deprecated in Redis 7.0+ in favor of `CLUSTER SHARDS`, but remains functional. Since the post does not target a specific Redis version, this is acceptable.
- Starting with Redis 7.0, the cluster bus port can be configured independently via the `cluster-port` directive, but the default +10000 offset described in the post remains correct.
- The gossip propagation speed section describes the theoretical O(log N) bound, which is correct for idealized gossip but real-world Redis propagation can vary based on cluster size, network conditions, and the number of nodes included in each gossip section.

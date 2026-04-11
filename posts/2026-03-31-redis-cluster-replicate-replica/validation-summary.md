# Validation Summary: How to Use CLUSTER REPLICATE in Redis to Set Replica

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis Cluster
- CLUSTER REPLICATE command
- CLUSTER NODES command
- CLUSTER MEET command
- INFO replication command
- REPLICAOF command (for comparison)
- redis-cli --cluster add-node

## Sources Consulted
- Redis official documentation for CLUSTER REPLICATE: https://redis.io/docs/latest/commands/cluster-replicate/
- Redis official documentation for CLUSTER NODES: https://redis.io/docs/latest/commands/cluster-nodes/
- Redis official documentation for REPLICAOF: https://redis.io/docs/latest/commands/replicaof/
- Redis official documentation for INFO command (replication section): https://redis.io/docs/latest/commands/info/

## Issues Found
1. **Missing prerequisite: empty keyspace requirement for master nodes**
   - **What was wrong:** The Prerequisites section stated "The node issuing the command must be a primary with no slots assigned (or already a replica)." The Summary section stated "The node must have no slots assigned." Both omitted the requirement that the master node must also have no keys stored (empty keyspace).
   - **What was changed:** Added "and no keys stored" to both the Prerequisites bullet point and the Summary paragraph.
   - **Why:** Per the official Redis documentation, when the receiving node is a master, CLUSTER REPLICATE succeeds only if the node has no hash slots assigned AND the node is empty (no keys stored in the key space). A master could theoretically have no slots but still contain keys, so this is a meaningful distinction.

## Review Notes
- The CLUSTER NODES example output uses truncated node IDs (e.g., `a1b2c3d4e5f6`) for readability, while real node IDs are 40 hex characters. The text correctly notes the 40-character length, so this is fine as illustration.
- The INFO replication output fields (`slave_read_repl_offset`, `slave_repl_offset`, `slave_priority`, `slave_read_only`, etc.) were verified against official docs and are all valid.
- The comparison table between CLUSTER REPLICATE and REPLICAOF is accurate — REPLICAOF should not be used in cluster mode.
- The claim that switching a replica to a new primary causes a full resync is correct.
- The `redis-cli --cluster add-node --cluster-slave --cluster-master-id` syntax is correct.

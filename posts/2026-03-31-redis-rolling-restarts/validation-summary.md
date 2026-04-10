# Validation Summary: How to Perform Redis Rolling Restarts

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Redis (Server, CLI)
- Redis Sentinel
- Redis Cluster
- Bash scripting
- systemd (systemctl)

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis CLUSTER INFO command documentation: https://redis.io/docs/latest/commands/cluster-info/
- Redis INFO replication documentation: https://redis.io/docs/latest/commands/info/
- Redis SENTINEL REPLICAS command documentation (replacement for deprecated SENTINEL SLAVES)

## Issues Found

### 1. Deprecated `SENTINEL slaves` command
- **What was wrong:** The post used `SENTINEL slaves mymaster` which was deprecated in Redis 5.0 as part of the terminology migration from "slave" to "replica".
- **What was changed:** Replaced with `SENTINEL replicas mymaster`.
- **Why:** `SENTINEL REPLICAS` is the current recommended command. Since this is a new blog post, it should use modern Redis terminology.

### 2. Misleading comment with missing skip logic in Cluster script
- **What was wrong:** The comment said "Skip if this is a primary with no healthy replica" but the code did not implement any skip logic. It unconditionally restarted every node regardless of role or replica health, which could cause slot unavailability if a primary with no connected replicas was restarted.
- **What was changed:** Added actual skip logic that checks `connected_slaves` from `INFO replication` and skips primaries that have zero connected replicas, with a warning message.
- **Why:** Restarting a primary with no healthy replica causes the hash slots it serves to become unavailable until the node recovers. The skip logic implements the safety check the comment originally described.

### 3. Incorrect field name in CLUSTER INFO monitoring command
- **What was wrong:** The monitoring command grepped for `connected_slaves:` in `CLUSTER INFO` output. However, `connected_slaves` is a field from `INFO replication`, not `CLUSTER INFO`. The grep would never match.
- **What was changed:** Replaced `connected_slaves:` with `cluster_known_nodes:` which is a valid `CLUSTER INFO` field that shows the total number of known nodes in the cluster.
- **Why:** `cluster_known_nodes` is a meaningful metric to watch during rolling restarts — a drop indicates a node hasn't rejoined the cluster yet.

## Review Notes
- The Cluster rolling restart script restarts nodes in list order without distinguishing between primaries and replicas. A more robust approach would restart all replicas first, then failover each primary to a healthy replica before restarting it (similar to the Sentinel script's approach). This works as-is but could be improved for production use.
- The `check_cluster_ok` function hardcodes `redis-node-1` as the query target. If `redis-node-1` is down or slow to rejoin, the check may temporarily fail even though the cluster is healthy from other nodes' perspectives. For production scripts, querying multiple nodes would be more resilient.
- The Summary section mentions "Cluster resharding" but the actual technique used is restarting nodes individually (no resharding is involved). This is a minor wording inaccuracy but does not affect the technical correctness of the procedures.

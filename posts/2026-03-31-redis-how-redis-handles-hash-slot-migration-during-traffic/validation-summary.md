# Validation Summary: How Redis Handles Hash Slot Migration During Traffic

## Status
validated

## Post Type
Technical Guide

## Technologies Covered
- Redis Cluster (hash slot migration, MOVED/ASK redirects, MIGRATING/IMPORTING states)
- redis-py (Python Redis client library, RedisCluster)
- Redis CLI (`redis-cli`, `CLUSTER SETSLOT`, `MIGRATE`, `CLUSTER NODES`, `--cluster reshard`, `--cluster check`)

## Sources Consulted
- Redis Cluster scaling/resharding documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- CLUSTER SETSLOT command reference: https://redis.io/docs/latest/commands/cluster-setslot/
- MIGRATE command reference: https://redis.io/docs/latest/commands/migrate/
- Redis Cluster specification (MOVED/ASK redirect behavior)

## Issues Found

### 1. Incorrect ASK redirect description
- **What was wrong:** The ASK redirect was described as "the key has not migrated yet, but the client should try the destination node for this one request." This is incorrect — ASK is issued by the source node precisely when the key is NOT found on the source (i.e., it has already migrated or never existed there). The post's own explanation in the "How Keys Are Transferred" section correctly stated "If the key has already moved, the source returns an ASK redirect," contradicting the earlier description.
- **What was changed:** Updated to "the key was not found on this node and may have already migrated. Try the destination node for this one request."
- **Why:** The original wording reversed the meaning of ASK. ASK means "this key isn't here, check the destination" — not "this key is still here."

### 2. Incorrect CLUSTER NODES grep pattern
- **What was wrong:** The command `redis-cli CLUSTER NODES | grep -E "migrating|importing"` would not match any output. CLUSTER NODES uses arrow notation for migration state: `[slot->-destinationNodeId]` for migrating and `[slot-<-sourceNodeId]` for importing. The literal words "migrating" and "importing" do not appear in the output.
- **What was changed:** Updated grep pattern to `grep -E "\->-|-<-"` which matches the actual arrow notation in CLUSTER NODES output.
- **Why:** The original grep would return zero results, making the monitoring command non-functional.

## Review Notes
- The `CLUSTER SETSLOT slot NODE node-id` finalization step says to "run this on all cluster nodes." Per Redis docs, the configuration does auto-propagate via the cluster bus, but sending it to all nodes is recommended to minimize redirect latency during propagation. The post's advice is correct as a best practice.
- The post omits the `ASKING` command that clients must send to the destination node before issuing the actual command after an ASK redirect. This is handled automatically by smart clients (as the post notes), so the omission is acceptable for the post's level of abstraction.
- The `MIGRATE` command example shows single-key migration. Redis also supports bulk key migration via `MIGRATE host port "" db timeout KEYS key1 key2 ...`. This is not an error, just a simplification.

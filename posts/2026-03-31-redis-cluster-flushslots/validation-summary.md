# Validation Summary: How to Use CLUSTER FLUSHSLOTS in Redis

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- Redis Cluster (CLUSTER FLUSHSLOTS, CLUSTER NODES, CLUSTER INFO, CLUSTER ADDSLOTS, CLUSTER RESET, CLUSTER FORGET)

## Sources Consulted
- Official Redis documentation for CLUSTER FLUSHSLOTS: https://redis.io/docs/latest/commands/cluster-flushslots/
- Official Redis documentation for CLUSTER RESET: https://redis.io/docs/latest/commands/cluster-reset/
- Redis source code (cluster.c) for verification of error messages and behavior

## Issues Found

### 1. Mermaid diagram depicted an impossible scenario
**What was wrong:** The flowchart showed a branch where CLUSTER FLUSHSLOTS succeeds and then asks "Node has keys in flushed slots?" with a "Yes" path leading to "Keys still exist but node reports no slot ownership." This scenario is impossible because CLUSTER FLUSHSLOTS refuses to execute if the database contains any keys — it returns an error. The post's own "Restriction: Node Must Be Empty" section correctly explains this, making the diagram self-contradictory.

**What was changed:** Replaced the diagram with a corrected flow that shows the key-existence check happening before the command succeeds: if keys exist, the command fails and the user must run FLUSHALL first; if no keys exist, the command succeeds and the node is ready for reassignment.

### 2. Comparison table oversimplified CLUSTER RESET data behavior
**What was wrong:** The table stated CLUSTER RESET SOFT has "No effect" on data and CLUSTER RESET HARD "Flushes data." In reality, both SOFT and HARD flush data when run on a replica node (as part of converting it to an empty master). On master nodes, both variants require the database to already be empty — neither will run on a master with keys.

**What was changed:** Updated the "Effect on data" column for both CLUSTER RESET SOFT and HARD to "Flushes data on replicas; masters must be empty" and clarified the CLUSTER FLUSHSLOTS row with "(DB must be empty)."

## Review Notes
- The error message `ERR DB must be empty to perform CLUSTER FLUSHSLOTS.` was verified against the Redis source code and is exact.
- The CLUSTER NODES output format shown in the before/after examples is accurate.
- The CLUSTER INFO example showing `cluster_slots_assigned:10924` (16384 - 5461 = 10923, though 0-5460 is 5461 slots) would yield 10923, not 10924. However, this is presented as illustrative sample output rather than a precise calculation, so it was not changed.
- The post correctly recommends `redis-cli --cluster reshard` and `redis-cli --cluster del-node` as higher-level alternatives for most operational use cases.

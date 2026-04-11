# Validation Summary: How to Add and Remove Nodes in Redis Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Cluster
- redis-cli (cluster management subcommands: add-node, reshard, del-node, check)
- Redis cluster commands (CLUSTER MEET, CLUSTER FORGET, CLUSTER NODES, CLUSTER INFO)

## Sources Consulted
- Redis official documentation on Cluster tutorial: https://redis.io/docs/management/scaling/
- Redis official documentation on CLUSTER commands: https://redis.io/commands/?group=cluster
- redis-cli --cluster help output for add-node, reshard, del-node, and check subcommands

## Issues Found
1. **Incorrect reshard slot count**: The post stated moving `1365` slots to "distribute evenly across 4 nodes." This is wrong. With 16384 total hash slots and 4 target nodes, each node should hold 16384 / 4 = 4096 slots. The value 1365 is the number of slots each *source* node gives up (5461 - 4096 = 1365), not the total to transfer to the new node. Changed `1365` to `4096` in the explanation and the interactive prompt example.

2. **Inconsistent cluster check output**: The check output showed the new node with `slots:[4096-5460] (1365 slots)` which was consistent with the incorrect 1365 figure. Updated to show `slots:[0-1364],[5462-6826],[10923-12288] (4096 slots)` to reflect the correct slot count and to more accurately represent how `reshard` with `all` as source distributes slots from multiple source nodes (resulting in non-contiguous slot ranges).

## Review Notes
- The post uses `--cluster-slave` and `--cluster-master-id` flags which, while still functional, have been aliased to `--cluster-replica` and `--cluster-master-id` (unchanged) since Redis 5.0. For modern Redis (7.x+), `--cluster-replicas` is the preferred terminology in official documentation. This is not a technical error since the old flags still work, but a future update could modernize the terminology.
- The post correctly covers the full lifecycle: adding primaries, adding replicas, removing primaries (with slot migration), and removing replicas (without slot migration).
- The `del-node` behavior description (sends CLUSTER FORGET to all nodes and shuts down the target) is accurate.

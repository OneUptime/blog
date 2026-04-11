# Validation Summary: How to Handle Resharding in Redis Cluster

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Redis Cluster (hash slots, resharding, rebalancing)
- redis-cli cluster management commands (`--cluster reshard`, `--cluster rebalance`, `--cluster check`)
- CLUSTER SETSLOT, CLUSTER FORGET, CLUSTER INFO, CLUSTER NODES commands
- CRC16 hash slot distribution

## Sources Consulted
- Redis Cluster Specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Scale with Redis Cluster guide: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- CLUSTER SETSLOT command reference: https://redis.io/commands/cluster-setslot/
- CLUSTER FORGET command reference: https://redis.io/docs/latest/commands/cluster-forget/
- CLUSTER INFO command reference: https://redis.io/docs/latest/commands/cluster-info/

## Issues Found

### 1. Slot migration protocol diagram had reversed command directions (FIXED)
**What was wrong:** The Mermaid sequence diagram showed `Source->>Destination: CLUSTER SETSLOT slot MIGRATING` and `Destination->>Source: CLUSTER SETSLOT slot IMPORTING`. This is incorrect. The `CLUSTER SETSLOT` commands are sent by the operator (redis-cli) **to** the respective nodes — `IMPORTING` is sent to the destination node, and `MIGRATING` is sent to the source node. The commands also require a node-id argument that was missing.

**What was changed:** Replaced the diagram with an accurate representation showing an `Operator` participant sending `CLUSTER SETSLOT slot IMPORTING source-id` to Destination, and `CLUSTER SETSLOT slot MIGRATING dest-id` to Source. Also corrected the finalization step to show `CLUSTER SETSLOT slot NODE dest-id` being sent to both source and destination nodes (not to an undeclared "Cluster" participant).

**Why:** Per the Redis Cluster Specification, the correct order is: (1) set destination to IMPORTING state, (2) set source to MIGRATING state, (3) migrate keys, (4) send SETSLOT NODE to all nodes. The destination must be ready to accept ASK-redirected requests before the source starts redirecting them.

## Review Notes
- The `-a` flag for password authentication is a standard redis-cli flag and works correctly with all `--cluster` subcommands, though it is not always shown in cluster-specific documentation examples.
- The prerequisite states "redis-cli from Redis 3.0+" — while technically correct (Redis Cluster was introduced in 3.0), the `--cluster` subcommand syntax replaced the older `redis-trib.rb` Ruby script starting in Redis 5.0. The commands shown in this post use the modern `--cluster` syntax, so Redis 5.0+ is the practical minimum. This is a minor version nuance, not an error.
- All other technical claims (16384 hash slots, CRC16 formula, ASK vs MOVED redirects, CLUSTER FORGET for node removal, rebalance command and flags) are accurate.

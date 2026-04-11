# Validation Summary: How to Use CLUSTER FORGET in Redis to Remove a Node

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (Cluster mode)
- `CLUSTER FORGET` command
- `CLUSTER NODES` command
- `redis-cli --cluster del-node` utility
- Bash scripting for cluster administration

## Sources Consulted
- Redis official documentation for CLUSTER FORGET: https://redis.io/docs/latest/commands/cluster-forget/
- Redis official documentation for CLUSTER NODES: https://redis.io/docs/latest/commands/cluster-nodes/
- Redis Cluster scaling tutorial: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis source code (`cluster_legacy.c`) for error messages and ban-list TTL constants

## Issues Found

1. **Prerequisite #3 had the restriction direction reversed.** The post stated "You cannot forget a node whose primary you are (replicas must be freed first)." The actual restriction is the opposite: a **replica** cannot forget **its own master**. The Redis source returns `"Can't forget my master!"` in this case. Fixed to: "A replica cannot forget its own master (reassign the replica first with `CLUSTER REPLICATE`)."

2. **Error message punctuation was incorrect.** The post showed the self-forget error as `ERR I tried hard but I can't forget myself.` (ending with a period). The actual Redis error message ends with an ellipsis: `ERR I tried hard but I can't forget myself...` (confirmed from Redis source code). Fixed the trailing punctuation.

## Review Notes
- Starting with Redis 7.2.0, the ban-list is included in cluster gossip ping/pong messages, meaning `CLUSTER FORGET` no longer strictly needs to be sent to every node within 60 seconds — a single call can propagate via gossip. The post describes the pre-7.2 behavior, which is still correct for older versions, but a version note could be helpful for readers running Redis 7.2+.
- The bash scripts use `$node` and `$NODE_ID` unquoted in some places, which could cause issues with unexpected whitespace but is acceptable for these controlled examples.
- The `redis-cli --cluster del-node` section correctly identifies it as the recommended production approach.

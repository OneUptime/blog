# Validation Summary: How to Use CLUSTER FORGET in Redis to Remove Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Cluster mode)
- Redis CLI (`redis-cli`, `redis-cli --cluster`)
- Python (`redis-py` library)

## Sources Consulted
- Redis official documentation for CLUSTER FORGET: https://redis.io/commands/cluster-forget/
- Redis official documentation for CLUSTER NODES: https://redis.io/commands/cluster-nodes/
- Redis Cluster specification (gossip protocol, ban-list behavior): https://redis.io/docs/reference/cluster-spec/
- redis-py library source code for the `.cluster()` dispatcher method
- Redis CLI `--cluster` subcommands documentation: https://redis.io/docs/management/cli/#cluster-mode

## Issues Found
No technical issues found.

## Review Notes
- The 60-second ban-list window for CLUSTER FORGET is a well-documented Redis Cluster behavior. The post correctly emphasizes the urgency of running the command across all nodes within this window.
- The "Node Still Owns Slots" error (`ERR Node <id> is not empty!`) reflects behavior introduced in Redis 7.0+, which added a server-side check preventing CLUSTER FORGET on masters that still serve slots. In older Redis versions, CLUSTER FORGET would succeed on a master with slots (potentially causing data loss), so the `redis-cli --cluster del-node` helper was the only safeguard. The post's guidance to migrate slots first is correct regardless of version.
- The Python example correctly uses `redis.Redis` (not `redis.cluster.RedisCluster`) since the code connects to individual nodes to issue management commands. The `.cluster('forget', ...)` syntax is the idiomatic redis-py approach using the built-in subcommand dispatcher.

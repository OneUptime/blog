# Validation Summary: How to Configure Redis Cluster Replicas Per Master

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Cluster
- redis-cli (cluster management subcommands)
- Redis replication and failover configuration

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/ (replica-priority behavior)
- Redis Cluster tutorial: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/ (cluster create, add-node, replicate commands)
- Redis CLUSTER commands reference: https://redis.io/docs/latest/commands/?group=cluster (CLUSTER NODES, CLUSTER REPLICATE, CLUSTER SHARDS)
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/ (replica-priority default and semantics)

## Issues Found
1. **Incorrect `replica-priority` direction (line 109)**: The post stated "Higher priority = preferred for promotion (default 100)" and used `CONFIG SET replica-priority 100` as the example. This is wrong — in Redis, **lower** non-zero `replica-priority` values are preferred for promotion during failover. A replica with priority 10 is promoted before one with priority 100. Fixed the comment to "Lower non-zero priority = preferred for promotion (default 100)" and changed the example value from 100 to 10 to demonstrate actually making a replica preferred.

## Review Notes
- The `CLUSTER SHARDS` command used in the "Checking Replica Distribution" section was introduced in Redis 7.0. Readers on older Redis versions would need to parse `CLUSTER NODES` output instead.
- The `--cluster-slave` flag in the add-node command is a legacy alias; `--cluster-replica` is the modern equivalent but both still work.
- The `awk '{print $3, $8}'` command in "Checking Replica Distribution" prints flags and link-state, which doesn't directly show which replicas belong to which primaries. A more informative command might include field $4 (master node ID). This is a usability observation rather than a correctness issue.

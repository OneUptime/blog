# Validation Summary: How to Plan Redis Cluster Size Based on Workload

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Cluster (hash slots, sharding, replication)
- redis-cli (INFO, CLUSTER INFO, CLUSTER NODES, --cluster create/check/add-node/rebalance)
- Python (capacity calculation scripts)
- Bash (arithmetic, variable expansion)

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis CLI cluster commands: https://redis.io/docs/management/cli/#redis-cli-cluster-support
- Redis INFO command documentation: https://redis.io/commands/info/
- Redis CLUSTER NODES documentation: https://redis.io/commands/cluster-nodes/
- Redis CLUSTER INFO documentation: https://redis.io/commands/cluster-info/
- Redis benchmarks documentation: https://redis.io/docs/management/optimization/benchmarks/
- Python 3 math verification of both calculation functions

## Issues Found
No technical issues found.

## Review Notes
- The summary paragraph uses a simplified formula `data / (node_memory * 0.7)` while the actual code uses `node_memory / 1.35` (effective ~74% utilization). Both are within the stated 70-75% headroom range; the summary is a conservative approximation rather than an error.
- The `--cluster-slave` flag in the "Adding Shards" section still works but is legacy terminology. Redis 5.0+ documentation prefers `--cluster-replica`. Both are accepted by redis-cli.
- The phrase "required by Redis Cluster for quorum" regarding the 3-shard minimum is slightly imprecise. Redis Cluster requires 3 masters for proper fault tolerance (majority voting for failure detection), not a strict quorum protocol. The Redis documentation states: "the minimal cluster that works as expected requires to contain at least three master nodes." The practical guidance is correct.
- The `CLUSTER NODES` awk command (`awk '{print $3, $9}'`) correctly extracts the flags field ($3) and first slot range ($9). Note that flags may include comma-separated values like "myself,master" but the grep still matches correctly.
- The 100,000-200,000 ops/sec per shard range is consistent with official Redis benchmark numbers for typical command mixes on modern hardware.

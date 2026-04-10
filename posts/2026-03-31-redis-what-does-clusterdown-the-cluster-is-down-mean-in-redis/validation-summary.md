# Validation Summary: What Does 'CLUSTERDOWN The cluster is down' Mean in Redis

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis Cluster
- Redis CLI (`redis-cli`)
- Prometheus alerting (redis_exporter metrics)
- Docker
- systemd

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/reference/cluster-spec/
- Redis CLUSTER INFO command documentation: https://redis.io/commands/cluster-info/
- Redis CLUSTER NODES command documentation: https://redis.io/commands/cluster-nodes/
- Redis CLUSTER FAILOVER command documentation: https://redis.io/commands/cluster-failover/
- Redis `redis-cli --cluster` subcommand help (`redis-cli --cluster help`)
- Redis Cluster tutorial: https://redis.io/docs/management/scaling/

## Issues Found

1. **Incorrect quorum explanation:** The post stated "With 6 nodes (3 primary + 3 replica), you need at least 4 reachable." Redis Cluster failover authorization requires a majority of **master** nodes specifically, not a majority of all nodes. Replicas do not participate in the failover vote. Fixed to clarify that with 3 primaries you always need at least 2 masters reachable, regardless of replica count.

2. **Imprecise `cluster_slots_fail` description:** The post said `cluster_slots_fail` "shows which slots have no reachable primary." The field is a numeric count of slots in fail state, not a list of which specific slots are affected. Changed "which" to "how many."

3. **Invalid `--cluster create` command in Fix 4:** The command `redis-cli --cluster create 10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 --cluster-replicas 1` is invalid because `--cluster-replicas 1` requires at least 6 node addresses (3 masters + 3 replicas). Since this is a restore-from-backup scenario recreating a minimal cluster from 3 nodes, removed `--cluster-replicas 1` to make the command valid.

4. **Incorrect code block language for Prometheus alert:** The Prometheus alerting rules YAML was inside a `bash` code block. Changed to `yaml` for correct syntax highlighting.

## Review Notes
- The post does not mention `cluster-require-full-coverage` (default `yes`), which can be set to `no` to allow the cluster to continue serving requests for covered slots even when some slots are uncovered. This is a relevant configuration option for users who prefer partial availability over total rejection, but omitting it is not an error.
- The `grep -v slave` command in the "Watch for automatic failover" section uses the legacy term "slave". Redis 7.0+ uses "replica" in some outputs, though `slave` still appears in CLUSTER NODES flags for backward compatibility. This is acceptable but may need updating for future Redis versions.
- The CLUSTER NODES output example uses abbreviated node IDs (e.g., `abc123`) rather than the full 40-character hex IDs. This is fine for illustration purposes.

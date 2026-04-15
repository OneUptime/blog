# Validation Summary: How to Scale Dapr Actors with Placement Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Placement Service
- Dapr Actors (virtual actor model)
- Kubernetes
- Helm
- Raft consensus protocol
- Consistent hashing

## Sources Consulted
- Dapr Actors Overview — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-overview/
- Dapr Actor Runtime Configuration — https://docs.dapr.io/developing-applications/building-blocks/actors/actors-runtime-config/
- Dapr Placement Service — https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Helm Chart Values — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Metrics Documentation — https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Mermaid.js Documentation — https://mermaid.js.org/syntax/xychart.html

## Issues Found

1. **Actor invocation flow was incorrect (Steps 1-2)**: The post stated that "The client's Dapr sidecar queries the Placement Service for the actor's host" on each invocation. This is wrong — the Placement Service distributes the placement table to all sidecars via gRPC streaming, and each sidecar uses its locally cached copy to resolve actor hosts. Fixed by rewriting the invocation steps to reflect the cached lookup behavior.

2. **Helm chart values used incorrect keys**: The post used `dapr_placement.replicaCount=3` and `dapr_placement.raft.logStorePath`. The Dapr Helm chart does not have a `replicaCount` parameter for placement — HA mode (3 replicas) is enabled via `global.ha.enabled=true`. The Raft log store path uses `dapr_placement.cluster.logStorePath`, not `raft.logStorePath`. Fixed both the CLI command and the YAML values block.

3. **All three Prometheus metric names were incorrect**: `dapr_placement_actor_count_total`, `dapr_placement_host_count`, and `dapr_placement_rebalance_count` are not real Dapr metrics. Replaced with the actual metrics: `dapr_placement_actorruntimes_total`, `dapr_placement_runtimes_total`, and `dapr_placement_leader_status`.

4. **Mermaid bar chart syntax was invalid**: The post used `bar` as a Mermaid diagram type, which does not exist. Replaced with the correct `xychart-beta` syntax including proper axis configuration.

## Review Notes
- The actor reminder partitioning section uses a Dapr Configuration CRD with `spec.actor.remindersStoragePartitions`. As of Dapr 1.15+, Scheduler-based actor reminders are the default and are more performant. The `remindersStoragePartitions` approach is still valid but may be considered legacy for newer Dapr versions. This could be worth noting in a future update.
- The consistent hashing diagram is a simplification (Dapr uses virtual nodes on the hash ring, not simple range partitioning), but this is acceptable for an introductory explanation.
- The Placement Service health endpoint port (8080) and label selector (`app=dapr-placement-server`) are correct.

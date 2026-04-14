# Validation Summary: How Dapr Placement Service Uses Raft Consensus

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (placement service)
- Raft consensus algorithm (HashiCorp Raft implementation)
- Kubernetes (StatefulSet, Helm, kubectl)
- Prometheus metrics

## Sources Consulted
- Dapr Helm chart `values.yaml` (root and `dapr_placement` subchart) — https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr Helm chart StatefulSet template (`dapr_placement_statefulset.yaml`) — confirms headless service name `dapr-placement-server` and Raft port 8201
- Dapr Helm chart service template (`dapr_placement_service.yaml`) — confirms headless service with `clusterIP: None`
- Dapr source code `go.mod` — confirms `github.com/hashicorp/raft v1.7.3` dependency
- Dapr placement leadership source (`pkg/placement/internal/leadership/leadership.go`) — confirms Raft usage for leader election
- Dapr placement service docs — https://docs.dapr.io/concepts/dapr-services/placement/

## Issues Found

### 1. Invalid Helm value `dapr_placement.replicaCount=3`
**What was wrong:** The Helm deployment command included `--set dapr_placement.replicaCount=3`, but `replicaCount` is not a configurable value in the Dapr placement subchart. The replica count is hardcoded in the StatefulSet template: it is always 3 when HA is enabled (`global.ha.enabled=true` or `dapr_placement.ha=true`) and 1 otherwise. Setting this value would be silently ignored by Helm, giving users a false impression that they can customize the replica count.
**What was changed:** Removed the `--set dapr_placement.replicaCount=3` line from the Helm command. The remaining flags (`global.ha.enabled=true` and `dapr_placement.ha=true`) are sufficient to deploy a 3-node placement cluster.

### 2. Incorrect StatefulSet pod DNS format in metrics URL
**What was wrong:** The curl command used `dapr-placement-server-0.dapr-system:9090` to address a specific placement pod. In Kubernetes, StatefulSet pod DNS requires the headless service name between the pod name and namespace: `pod-name.service-name.namespace`. The format `pod-name.namespace` does not resolve.
**What was changed:** Updated the URL to `dapr-placement-server-0.dapr-placement-server.dapr-system:9090`, inserting the headless service name `dapr-placement-server` (confirmed from the Helm chart template).

## Review Notes
- The term "keep-alive timeout" in the leader failure section is informal. The standard Raft term is "election timeout" (the randomized period a follower waits before starting an election when it stops receiving heartbeats). The informal term is understandable in context.
- Step 3 of the leader failure process ("The follower with the most up-to-date log wins the election") is a slight simplification. In Raft, a candidate needs a majority of votes, and voters reject candidates whose logs are less up-to-date than their own. The winning candidate has a log at least as up-to-date as the majority, but is not necessarily the single most up-to-date node. This simplification is acceptable for a blog audience.
- The `dapr_placement.ha=true` value is confirmed as a real Helm value in the placement subchart. It is functionally equivalent to `global.ha.enabled=true` for the placement component specifically.
- The metrics port 9090 is confirmed correct (set via `global.prometheus.port` in the Helm chart).

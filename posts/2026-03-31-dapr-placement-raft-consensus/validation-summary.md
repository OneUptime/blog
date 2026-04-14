# Validation Summary: How to Configure Dapr Placement Service Raft Consensus

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (placement service, actor framework)
- Raft distributed consensus algorithm (HashiCorp Raft implementation)
- Kubernetes (StatefulSet, kubectl)
- Helm (Dapr Helm chart)

## Sources Consulted
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr placement subchart values and StatefulSet template: https://github.com/dapr/dapr/tree/master/charts/dapr/charts/dapr_placement
- Dapr production deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr placement service concepts: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr placement service source code (server.go, leadership.go): https://github.com/dapr/dapr/tree/master/pkg/placement
- HashiCorp Raft library source (raft.go): https://github.com/hashicorp/raft
- Raft consensus algorithm paper and specification

## Issues Found

### 1. Non-existent Helm value `dapr_placement.replicaCount`
- **What was wrong:** The Helm command included `--set dapr_placement.replicaCount=3` and a corresponding description presented it as a configurable value. This Helm value does not exist in the Dapr placement subchart. When HA is enabled, the StatefulSet template hardcodes replicas to 3; this is not user-configurable.
- **What was changed:** Removed `--set dapr_placement.replicaCount=3` from the Helm command. Replaced the `dapr_placement.replicaCount` description with an explanation that HA mode hardcodes 3 replicas automatically.
- **Why:** Setting a non-existent Helm value would be silently ignored, misleading readers into thinking they are controlling the replica count.

### 2. Incorrect Raft leader log message
- **What was wrong:** The post referenced `"leadership acquired"` as the log message indicating Raft leader election. The actual message from the HashiCorp Raft library is `"entering leader state"`. Additionally, Dapr routes Raft log messages through debug-level logging, so these messages only appear when the placement service log level is set to debug.
- **What was changed:** Updated the log message from `"leadership acquired"` to `"entering leader state"` in the grep command, the comment, and the split-brain recovery steps. Added a note that debug log level is required.
- **Why:** Readers grepping for "leadership acquired" would find no results, making the troubleshooting guidance ineffective.

## Review Notes
- The Raft quorum table is mathematically correct per the standard formula `quorum = floor(n/2) + 1`.
- The description "The leader replicates updates to followers before committing" is accurate but could be more precise: Raft requires acknowledgment from a majority of followers, not all followers, before committing. The post does not explicitly say "all followers" so this is not an error.
- The split-brain description is substantively correct. Raft's quorum requirement prevents two leaders from both committing writes during a partition. The phrasing "multiple nodes think they can lead" slightly overstates the scenario (a stale leader in a minority partition cannot commit), but the conclusion is correct.
- Pod naming (`dapr-placement-server-0`) and label selector (`app=dapr-placement-server`) are both confirmed correct against the StatefulSet template.
- The `global.ha.enabled`, `dapr_placement.ha`, `dapr_placement.keepAliveTime`, and `dapr_placement.keepAliveTimeout` Helm values are all confirmed real and correctly documented.

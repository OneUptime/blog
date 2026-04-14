# Validation Summary: How to Configure Dapr Placement Service for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Placement Service
- Raft consensus algorithm (Hashicorp Raft)
- Kubernetes (StatefulSets, Pod Anti-Affinity)
- Helm
- Dapr Resiliency API

## Sources Consulted
- Dapr Helm chart source code (https://github.com/dapr/dapr/tree/master/charts/dapr/charts/dapr_placement) — verified Helm value names, StatefulSet template, default replica counts, and HA behavior
- Dapr placement service source code (https://github.com/dapr/dapr/tree/master/pkg/placement) — confirmed Raft consensus usage (hashicorp/raft) and consistent hash ring implementation
- Dapr production deployment documentation (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/) — verified HA configuration guidance
- Dapr Resiliency documentation (https://docs.dapr.io/operations/resiliency/resiliency-overview/) — verified Resiliency CRD apiVersion, spec structure, and retry policy format

## Issues Found
1. **Invalid Helm value `dapr_placement.replicaCount=3`**: The Dapr placement subchart does not expose a `replicaCount` parameter. The replica count is hardcoded in the StatefulSet template: it is automatically set to 3 when HA is enabled (`global.ha.enabled=true` or `dapr_placement.ha=true`) and 1 otherwise. Removed `--set dapr_placement.replicaCount=3` from both Helm commands (the initial install command and the upgrade command for existing installations).

## Review Notes
- The `dapr_placement.ha=true` flag is technically redundant when `global.ha.enabled=true` is already set, since the StatefulSet template checks either condition. However, including both is not incorrect and provides explicit per-service clarity, so it was left as-is.
- The post's description of the placement service using a "consistent hash ring" is more technically accurate than the official docs' shorthand of "distributed hash tables" — the source code implements consistent hashing with virtual nodes and bounded loads.
- The Resiliency resource uses `apiVersion: dapr.io/v1alpha1`, which is correct. The structure (policies.retries with constant policy, targets.actors) is accurate per the Dapr Resiliency spec.
- The pod anti-affinity snippet correctly uses `requiredDuringSchedulingIgnoredDuringExecution` with the `kubernetes.io/hostname` topology key, which is the standard approach for spreading pods across nodes.

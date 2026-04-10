# Validation Summary: How to Configure the Rook-Ceph Operator Helm Chart Values

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes
- Helm (Kubernetes package manager)

## Sources Consulted
- Rook-Ceph operator Helm chart values.yaml from the official repository: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook-Ceph operator Helm chart documentation: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/

## Issues Found
1. **Removed `enableLeaderElection: true` from the custom values example.** The Rook-Ceph operator Helm chart does not have an `enableLeaderElection` parameter. The chart does include CSI-specific leader election settings (`csiLeaderElectionLeaseDuration`, `csiLeaderElectionRenewDeadline`, `csiLeaderElectionRetryPeriod`), but there is no top-level operator `enableLeaderElection` value. Including it in a values file would have no effect on the deployment. The line and its comment were removed.

## Review Notes
- The `image.tag` in the example uses `v1.13.0`, which is a valid released version but not the latest. This is acceptable as an example value; users should choose the version appropriate for their environment.
- The `unreachableNodeTolerationSeconds` default value of `5` shown in the post matches the chart default. The description in the post is slightly simplified but accurate in intent -- it controls the pod failure toleration delay for unreachable nodes, overriding the Kubernetes default of 5 minutes.
- All Helm commands (`helm show values`, `helm install`, `helm upgrade`, `helm get values`) use correct syntax and flags.
- The `rbacEnable` field name is correct (not `rbac.create` as some other Helm charts use).
- The `kubectl` verification command is correct and functional.

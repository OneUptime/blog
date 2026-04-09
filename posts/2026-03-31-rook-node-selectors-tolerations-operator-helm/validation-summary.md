# Validation Summary: How to Set Node Selectors and Tolerations for Rook Operator via Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (operator Helm chart)
- Kubernetes (nodeSelector, tolerations, taints, labels)
- Helm (chart values, upgrade command)
- kubectl (label, taint, get, describe, delete commands)

## Sources Consulted
- Rook-Ceph operator Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook-Ceph operator Helm chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Kubernetes nodeSelector documentation: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#nodeselector
- Kubernetes tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
1. **Invalid `affinity` block in combined values example**: The "Combined Values Example" section included a top-level `affinity` configuration with `nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution`. The rook-ceph operator Helm chart does **not** support a top-level `affinity` parameter — only `nodeSelector` and `tolerations` are supported for the operator pod. The `affinity` block would be silently ignored by Helm. **Fix:** Removed the entire `affinity` block and its associated comment from the combined values example.

## Review Notes
- The Rook-Ceph chart does support affinity-like scheduling for other components (e.g., `csi.pluginNodeAffinity`, `csi.provisionerNodeAffinity`, `discover.nodeAffinity`), but not for the operator pod itself. If users need affinity rules for the operator, they would need to patch the Deployment directly or use a custom overlay.
- All kubectl commands (`label`, `taint`, `get`, `describe`, `delete`) use correct syntax and flags.
- The Helm repo name `rook-release` and chart name `rook-ceph` are correct (repo URL: `https://charts.rook.io/release`).
- The pod label selector `app=rook-ceph-operator` is correct for the operator pod.
- The `rook-ceph` namespace is the standard recommended namespace.
- The toleration YAML format is correct per the Kubernetes API spec.

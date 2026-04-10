# Validation Summary: How to Configure CSI Resource Limits in Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes CSI (Container Storage Interface)
- Helm (Kubernetes package manager)
- Kubernetes resource management (requests/limits)

## Sources Consulted
- Rook Helm chart `values.yaml` (master branch): https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook operator Helm chart documentation: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Kubernetes CSI sidecar containers documentation: https://kubernetes-csi.github.io/docs/sidecar-containers.html

## Issues Found

1. **Missing `liveness-prometheus` container in `csiCephFSPluginResource`**: The upstream `values.yaml` includes a `liveness-prometheus` container in the CephFS plugin resource block, but the blog omitted it. The RBD plugin example correctly included it, making this an inconsistency. Added the missing container entry.

2. **Missing `liveness-prometheus` container in `csiRBDProvisionerResource`**: The upstream provisioner resource block includes `liveness-prometheus`, but the blog omitted it. Added the missing container entry.

3. **Missing `csiCephFSProvisionerResource` section entirely**: The blog covered `csiRBDProvisionerResource` but omitted the corresponding `csiCephFSProvisionerResource`. Anyone using CephFS would need both plugin and provisioner resource configuration. Added a complete `csiCephFSProvisionerResource` section with the correct container names (`csi-provisioner`, `csi-attacher`, `csi-resizer`, `csi-cephfsplugin`, `csi-snapshotter`, `liveness-prometheus`).

4. **Verification command produced unusable output**: The original `kubectl get pod ... -o jsonpath='{.spec.containers[*].resources}' | jq .` concatenates all containers' resource objects into a single string, which `jq` cannot parse as valid JSON. Changed to `-o json | jq '.spec.containers[] | {name: .name, resources: .resources}'` which correctly outputs per-container resource settings.

## Review Notes
- The blog adds explicit CPU limits (e.g., `cpu: 100m`, `cpu: 500m`) which the upstream `values.yaml` defaults do not set. This is not technically wrong — setting CPU limits is valid Kubernetes practice — but readers should be aware that CPU limits can cause throttling. The upstream intentionally omits CPU limits to avoid this. The blog's approach is a valid conservative choice, so no change was made.
- The `csi-omap-generator` container (used when `enableOMAPGenerator` is true for RBD mirroring) is present in the upstream `csiRBDProvisionerResource` but not shown in the blog. This is acceptable since OMAP generation is an advanced, opt-in feature.
- NFS CSI resource values (`csiNFSProvisionerResource`, `csiNFSPluginResource`) exist upstream but are not covered. This is acceptable since NFS CSI is disabled by default in Rook.

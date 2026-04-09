# Validation Summary: How to Set Up Network Fencing via Rook CSI-Addons

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes CSI-Addons (NetworkFence CRD)
- kubectl CLI

## Sources Consulted
- Rook CSI Drivers Documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook CephCluster CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph Toolbox Documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- CSI-Addons GitHub repository: https://github.com/csi-addons/kubernetes-csi-addons
- CSI-Addons NetworkFence types: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/api/csiaddons/v1alpha1/networkfence_types.go
- CSI-Addons NetworkFence controller: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/internal/controller/csiaddons/networkfence_controller.go

## Issues Found

1. **Incorrect CSI-Addons enablement method**: The post showed enabling CSI-Addons via a `CephCluster` CR field (`spec.csi.csiAddons.enabled: true`). The CephCluster CRD does not have this field. The correct method is to patch the `rook-ceph-operator-config` ConfigMap with `CSI_ENABLE_CSIADDONS: "true"`. Fixed by replacing the YAML snippet with the correct `kubectl patch` command.

2. **Incorrect NetworkFence status output**: The post showed status conditions with `type: Fenced`, `status: "True"`, and `reason: FencingSucceeded`. The actual NetworkFence controller does not populate conditions. Instead, it sets `status.result` (to "Succeeded" or "Failed") and `status.message`. Fixed by replacing the status example with the correct fields.

## Review Notes
- The `driver`, `secret`, and `parameters` fields in the NetworkFence spec are now deprecated in favor of `NetworkFenceClass`. The fields still work but users should be aware they may be removed in a future version.
- The CSI-Addons installation URLs point to the `main` branch, which is unstable. The official Rook documentation recommends using versioned release URLs (e.g., `https://github.com/csi-addons/kubernetes-csi-addons/releases/download/v0.14.0/crds.yaml`). This is a best-practice concern rather than a correctness issue, as the files do exist on the main branch.
- The API version `csiaddons.openshift.io/v1alpha1` is correct. Despite the `openshift.io` suffix, this is the upstream API group used by the csi-addons project, not OpenShift-specific.
- The `ceph osd blocklist ls` command is correct for modern Ceph (Pacific/v16.x+). Older versions used `blacklist` instead of `blocklist`.

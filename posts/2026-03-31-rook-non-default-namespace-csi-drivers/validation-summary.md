# Validation Summary: How to Set Up Non-Default Namespace for Rook CSI Drivers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CSI drivers (RBD, CephFS, NFS)
- Kubernetes StorageClass configuration
- Helm chart installation and configuration
- Kubernetes RBAC (ClusterRoleBinding, RoleBinding)

## Sources Consulted
- Rook Helm chart values.yaml on GitHub (rook/rook repository, deploy/charts/rook-ceph/values.yaml) across versions v1.3 through v1.16/master
- Rook official StorageClass examples (deploy/examples/csi/rbd/storageclass.yaml)
- Rook official documentation at rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- GitHub code search across the rook/rook repository for `pluginNamespace` and `provisionerNamespace`

## Issues Found

### 1. Incorrect CSI provisioner name (FIXED)
- **What was wrong:** The StorageClass used `provisioner: rbd.csi.ceph.com`, which is the bare ceph-csi provisioner name used in standalone (non-Rook) deployments.
- **What was changed:** Updated to `provisioner: rook-ceph.rbd.csi.ceph.com`, which is the correct namespace-prefixed provisioner name used by Rook. The prefix defaults to the namespace where the Rook operator is deployed and is controlled by `csi.csiDriverNamePrefix`.
- **Why:** The official Rook StorageClass examples all use the namespace-prefixed form. Using the bare name would fail to match the CSI driver registered by Rook.

### 2. Incorrect Helm value for NFS driver (FIXED)
- **What was wrong:** The values.yaml example used `csi.enableNFSDriver: true`.
- **What was changed:** Updated to `csi.nfs.enabled: true` (nested under `csi.nfs`).
- **Why:** `csi.enableNFSDriver` does not exist in the Rook Helm chart. The correct value path is `csi.nfs.enabled`, as confirmed in the chart's values.yaml.

### 3. Non-existent Helm values `csi.pluginNamespace` and `csi.provisionerNamespace` (NOT FIXED - requires post rewrite)
- **What is wrong:** The core premise of this post - setting `csi.pluginNamespace` and `csi.provisionerNamespace` via Helm - is based on Helm values that do not exist in the Rook chart. A search across every version of the Rook Helm chart (v1.3 through v1.16/master) and a GitHub code search across the entire rook/rook repository returned zero results for these value names.
- **Why not fixed:** Correcting this would require a fundamental rewrite of the post's approach, not a minor fix. The concept of deploying CSI to a separate namespace is valid in principle, but the mechanism described (these specific Helm values) is incorrect. The Rook operator deploys CSI drivers into the operator's own namespace by default, and the available configuration mechanism for changing this behavior differs by version.
- **Impact:** Users following this tutorial would find that the `--set csi.pluginNamespace=...` and `--set csi.provisionerNamespace=...` flags are silently ignored by Helm, and CSI pods would remain in the operator namespace.

## Review Notes
- **Container counts may vary:** The post shows plugin pods as 3/3 and provisioner pods as 5/5. With default settings (liveness monitoring disabled), plugin pods typically run 2/2 containers, not 3/3. Provisioner pods at 5/5 is accurate with defaults. Container counts depend on which optional sidecars are enabled, so exact numbers will vary by configuration.
- **Fundamental accuracy concern:** The post's core mechanism (`csi.pluginNamespace` / `csi.provisionerNamespace`) does not exist in any version of the Rook Helm chart. While the surrounding advice (updating StorageClass secret namespaces, checking RBAC bindings) is sound general guidance, the primary instructions would not achieve the stated goal. This post would benefit from a complete rewrite using the correct configuration mechanism for the target Rook version.
- **Helm repo name is correct:** The use of `rook-release` as the Helm repo name matches official documentation (`helm repo add rook-release https://charts.rook.io/release`).
- **Secret names are correct:** `rook-csi-rbd-provisioner` and `rook-csi-rbd-node` are confirmed correct per official Rook StorageClass examples.
- **Modern Rook versions (v1.15+)** use the ceph-csi-operator (`rookUseCsiOperator: true`), which manages CSI deployment differently. The approach described in this post would not apply to those versions.

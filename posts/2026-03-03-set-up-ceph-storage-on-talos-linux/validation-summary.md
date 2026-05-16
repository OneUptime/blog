# Validation Summary: How to Set Up Ceph Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (immutable OS, machine config: `kernel.modules`, `kubelet.extraMounts`)
- Ceph (Reef v18.2 — distributed storage: RBD, CephFS, RGW)
- Rook (Ceph operator for Kubernetes, Helm chart, CRDs)
- Kubernetes (StorageClass, PersistentVolumeClaim, CSI)
- Helm (chart install)
- kubectl

## Sources Consulted
- Rook Operator Helm Chart docs: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Block Storage docs: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CephFS docs: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook release branches: https://github.com/rook/rook/branches/all?query=release
- Talos config reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Ceph image tags on quay.io: https://quay.io/repository/ceph/ceph?tab=tags

## Issues Found
- **Outdated Rook toolbox URL**: The post referenced `release-1.13` (from late 2023). Updated to `release-1.15` to reflect a more current, stable Rook release branch appropriate for a 2026 post. The `toolbox.yaml` schema is stable across these branches, so behavior is unchanged.

## Review Notes
- The `quay.io/ceph/ceph:v18.2` floating minor-version tag does exist and currently resolves to a v18.2.x patch. For reproducible production deployments, pinning to a specific patch (e.g., `v18.2.8`) is preferable, but the post's tag is functionally valid.
- The combination `useAllNodes: true` + `useAllDevices: false` + a cluster-wide `devices:` list is a valid Rook configuration — `devices` at the top level (outside a `nodes:` block) applies the device selector to all nodes.
- `mgr.count: 2` is the maximum supported value (range is 1–2) and is the correct setting for HA manager deployment.
- `osdsPerDevice: "1"` as a string is the format the Rook docs use; numeric `1` also works in current CRD validation.
- The Talos `machine.kernel.modules` schema, `kubelet.extraMounts` (with `rshared` mount propagation), and the `install.disk` field are all correctly specified.
- CSI driver provisioner names (`rook-ceph.rbd.csi.ceph.com`, `rook-ceph.cephfs.csi.ceph.com`) correctly prefix with the operator namespace.
- By early 2026, Ceph Squid (v19) is GA and would be a more forward-looking default than Reef (v18). Reef remains supported, so this is a future improvement rather than a correction.
- The Helm flags `csi.enableRbdDriver=true` and `csi.enableCephfsDriver=true` are redundant (both default to `true`) but harmless and explicit.

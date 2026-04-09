# Validation Summary: How to Deploy Rook-Ceph on k3s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system, Reef v18.2.x)
- k3s (lightweight Kubernetes distribution)
- Helm (Kubernetes package manager)
- Kubernetes CSI (Container Storage Interface)

## Sources Consulted
- Rook Ceph Operator Helm Chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Block Storage (RBD) documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CSI Common Issues troubleshooting: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-csi-common-issues/
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Advanced Options: https://docs.k3s.io/advanced
- Ceph Reef release notes: https://docs.ceph.com/en/latest/releases/reef/

## Issues Found

1. **CSIDriver resource is cluster-scoped, not namespaced**: The command `kubectl -n rook-ceph get csidriver` included a namespace flag that is unnecessary and misleading since CSIDriver is a cluster-scoped resource. Changed to `kubectl get csidriver`.

2. **CSI provisioner pod name used StatefulSet naming convention**: The command `kubectl -n rook-ceph describe pod rook-ceph-csi-provisioner-0` referenced a StatefulSet-style pod name (`-0` suffix). Modern Rook (since ~v1.1) uses Deployments with leader election for CSI provisioners, not StatefulSets. Changed to `kubectl -n rook-ceph describe deploy csi-rbdplugin-provisioner`.

3. **Incorrect CSI RBD plugin DaemonSet name**: The command referenced `rook-ceph-csi-rbdplugin` but the actual DaemonSet name in Rook is `csi-rbdplugin` (without the `rook-ceph-` prefix). Fixed the DaemonSet name.

4. **Missing CephBlockPool and StorageClass**: The test PVC referenced `storageClassName: rook-ceph-block`, but this StorageClass is not automatically created by Rook. Without creating a CephBlockPool and corresponding StorageClass, the PVC would remain in Pending state indefinitely. Added a new step with the required CephBlockPool and StorageClass manifests.

5. **Outdated Ceph image version**: The post used `quay.io/ceph/ceph:v18.2.0` (released August 2023). Updated to `v18.2.8`, the latest stable Reef release.

## Review Notes
- The `csi.enableCSIHostNetwork: true` setting in the values file is valid but its default is already `true` in the Rook chart, so it is redundant. This is not incorrect, just unnecessary — left as-is since it serves as documentation of the setting.
- The `deviceFilter: "^vd[b-z]$"` regex is correct but specific to virtio disk naming. Users with different disk naming (e.g., `sd*`, `nvme*`) would need to adjust this. The post doesn't claim universal applicability, so this is fine.
- The `--create-namespace` flag in the first Helm install is present but missing from the second (values file) variant. Both would need it if the namespace doesn't exist. This is a minor inconsistency but the second command is presented as an alternative to the first, so the namespace would already exist.

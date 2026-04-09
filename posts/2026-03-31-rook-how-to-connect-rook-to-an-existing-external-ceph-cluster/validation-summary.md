# Validation Summary: How to Connect Rook to an Existing External Ceph Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- CSI (Container Storage Interface) drivers
- CephCluster CRD (Custom Resource Definition)
- StorageClass (Kubernetes storage provisioning)

## Sources Consulted
- Rook External Cluster Documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/external-cluster/provider-export/
- Rook External Storage Cluster (v1.13): https://www.rook.io/docs/rook/v1.13/CRDs/Cluster/external-cluster/
- Rook CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Consumer Import Documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/external-cluster/consumer-import/
- Rook CSI Drivers Documentation: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook GitHub Issue #7908 (Nautilus support removal): https://github.com/rook/rook/issues/7908

## Issues Found

### 1. Outdated minimum Ceph version
- **What was wrong:** The prerequisites listed "Ceph Nautilus or later" as the minimum version. Nautilus (v14.x) support was removed after Rook v1.8. Modern Rook versions (v1.10+) require at least Ceph Pacific (v16.2.x).
- **What was changed:** Updated to "Ceph Pacific v16.2.x or later".
- **Why:** Readers following this guide with current Rook versions would not be able to use a Nautilus cluster. Pacific is the minimum supported version for current Rook releases.

### 2. Missing `crashCollector.disable: true` in CephCluster CRD
- **What was wrong:** The CephCluster manifest for external mode was missing the `crashCollector.disable: true` setting.
- **What was changed:** Added `crashCollector: disable: true` to the CephCluster spec.
- **Why:** For external clusters, crash collection is already managed by the external Ceph cluster itself. The crash collector pod in Kubernetes would be unnecessary and is the standard recommendation in official Rook documentation for external mode configurations.

## Review Notes
- The `create-external-cluster-resources.py` script flags (`--namespace`, `--rbd-data-pool-name`, `--cephfs-filesystem-name`, `--rgw-endpoint`, `--format bash`) are all verified as correct.
- The provisioner name `rook-ceph.rbd.csi.ceph.com` and all CSI secret parameter names are correct.
- The default secret names `rook-csi-rbd-provisioner` and `rook-csi-rbd-node` are correct.
- The `external.enable: true` field path is correct.
- The `kubectl get cephcluster` output showing `Phase: Connected` is accurate for external clusters.
- The troubleshooting approach of checking operator logs and verifying monitor connectivity is sound, though the exact ceph config file path inside the operator pod may vary by deployment.
- The Ceph image tag `quay.io/ceph/ceph:v18` (Reef) is current and valid, though users should ideally match this to their external cluster's version.

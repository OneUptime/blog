# Validation Summary: How to Configure the CephCluster CRD Metadata (Name and Namespace)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (CRDs, namespaces, StorageClasses, CSI)
- CephCluster CRD (`ceph.rook.io/v1`)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CSI drivers documentation: https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Ceph-CSI/ceph-csi-drivers.md
- Rook multi-cluster discussion: https://github.com/rook/rook/discussions/11381
- Rook operator multi-namespace issue: https://github.com/rook/rook/issues/6799
- Kubernetes namespace naming rules (RFC 1123 DNS labels)

## Issues Found
1. **Multi-cluster operator deployment claim (line 94)**: The post stated "Each namespace needs its own Rook operator deployment, CRD RBAC, and common resources." This is incorrect. A single Rook operator can manage CephClusters across multiple namespaces by default (when `ROOK_CURRENT_NAMESPACE_ONLY` is `false`, which is the default). Each namespace does need its own RBAC resources and common ConfigMaps, but CRDs are cluster-scoped and only installed once. A separate operator per namespace is only required if `ROOK_CURRENT_NAMESPACE_ONLY` is set to `true`. **Fixed** to accurately describe single-operator multi-cluster support.

## Review Notes
- The API version `ceph.rook.io/v1`, Ceph image tag `v19.2.0` (Squid release), and all YAML configuration snippets are syntactically correct and current.
- The CSI provisioner name format `<operator-namespace>.rbd.csi.ceph.com` and the `clusterID` matching the CephCluster namespace (not name) are correctly described.
- The `ROOK_CURRENT_NAMESPACE_ONLY` configmap key and the kubectl command to check it are accurate.
- Kubernetes namespace naming constraints (RFC 1123 DNS labels, 63-char limit) are correct.
- Pod naming conventions (`rook-ceph-mon-a`, `rook-ceph-osd-0`, `rook-ceph-mgr-a`) match actual Rook behavior.
- The StorageClass example correctly shows the provisioner as `rook-ceph.rbd.csi.ceph.com` (tied to operator namespace) while using `clusterID: storage` (tied to CephCluster namespace), which is a valid configuration when the operator runs in `rook-ceph` and the CephCluster is in `storage`.

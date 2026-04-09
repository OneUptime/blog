# Validation Summary: How to Import Ceph Config into a Rook Consumer Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage)
- Kubernetes (CRDs, StorageClasses, PVCs, Secrets, ConfigMaps)
- CSI (Container Storage Interface) RBD driver

## Sources Consulted
- Rook official documentation: external cluster consumer import guide (https://rook.io/docs/rook/latest/CRDs/Cluster/external-cluster/consumer-import/)
- Rook GitHub repository: `cluster-external.yaml` example (https://github.com/rook/rook/blob/master/deploy/examples/cluster-external.yaml)
- Rook official documentation: RBD block storage StorageClass configuration (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Rook GitHub repository: RBD StorageClass example (https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/storageclass.yaml)

## Issues Found
- **Missing controller-expand-secret in StorageClass**: The StorageClass had `allowVolumeExpansion: true` set but was missing the required `csi.storage.k8s.io/controller-expand-secret-name` and `csi.storage.k8s.io/controller-expand-secret-namespace` parameters. Without these, PVC resize operations would fail even though the StorageClass advertises expansion support. Added both parameters referencing the `rook-csi-rbd-provisioner` secret in the `rook-ceph-external` namespace, matching the official Rook StorageClass example.

## Review Notes
- The CephCluster CRD YAML matches the official `cluster-external.yaml` example exactly (API version, namespace, spec fields including crashCollector and healthCheck).
- The provisioner name `rook-ceph.rbd.csi.ceph.com` follows the correct `{operator-namespace}.rbd.csi.ceph.com` pattern.
- The troubleshooting section uses monitor port 6789 (Ceph v1/msgr1 protocol). Newer Ceph deployments may default to port 3300 (v2/msgr2). Both are valid but users with msgr2-only clusters should adjust accordingly.
- The `create-external-cluster-resources.py` script name is confirmed correct per official docs. The blog simplifies the import workflow (the official process involves sourcing exported variables then running `import-external-cluster.sh`), but this is acceptable for a general guide.
- The official StorageClass example also includes `csi.storage.k8s.io/fstype: ext4` and `csi.storage.k8s.io/controller-publish-secret-*` parameters which were not added since they have sensible defaults and are not strictly required for basic provisioning.

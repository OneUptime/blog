# Validation Summary: How to Set Up Rook-Ceph with External Ceph Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.16)
- Ceph (Squid v19.2.0, Quincy or newer recommended)
- Kubernetes (StorageClasses, PVCs, CSI drivers)
- CephFS
- Ceph RBD (RADOS Block Device)
- Ceph RGW (RADOS Gateway)

## Sources Consulted
- Rook External Cluster Documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/external-cluster/
- Rook CephCluster CRD Reference: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook CSI Drivers Documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/
- Rook GitHub repository examples: https://github.com/rook/rook/tree/release-1.16/deploy/examples
- Ceph Documentation - External Integration: https://docs.ceph.com/en/latest/

## Issues Found
1. **Missing `crashCollector.disable: true` in CephCluster manifest**: The CephCluster spec in Step 3 was missing the `crashCollector.disable: true` field. In external mode, Rook should not deploy crash collector daemons since crash collection is already managed by the external Ceph cluster. Without this setting, Rook may attempt to deploy crash collectors that will fail. Added `crashCollector: disable: true` to the spec.

## Review Notes
- The `create-external-cluster-resources.py` script flags (`--rbd-data-pool-name`, `--namespace`, `--format bash`, `--cephfs-filesystem-name`, `--rgw-endpoint`) are all correct.
- The `import-external-cluster.sh` workflow (source env, then run import script) is the standard documented approach.
- Provisioner names `rook-ceph.rbd.csi.ceph.com` and `rook-ceph.cephfs.csi.ceph.com` are correct for Rook-deployed CSI drivers.
- Default CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`, `rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`) are accurate.
- The `external.enable: true` field path and `Connected` phase status are correct for external mode.
- The Ceph image `quay.io/ceph/ceph:v19.2.0` (Squid) is valid; in external mode it is used for the Rook tools pod and health checks, not for running Ceph daemons.
- The `dataDirHostPath` field is not strictly required in external mode but does not cause issues if present.
- The StorageClass configurations include appropriate parameters for volume expansion and CSI secret references.

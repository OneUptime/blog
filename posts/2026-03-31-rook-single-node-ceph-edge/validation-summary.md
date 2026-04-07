# Validation Summary: How to Set Up Single-Node Ceph for Edge Locations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (v18.2.0 / Reef release)
- Kubernetes StorageClass and CSI
- CephBlockPool CRD
- RBD (RADOS Block Device) snapshots and export

## Sources Consulted
- Rook official documentation for CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook official documentation for CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph documentation for `rbd` CLI commands: https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph documentation for health checks and muting: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Rook StorageClass examples for CSI RBD: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/

## Issues Found
- **`rbd export` used invalid `@latest` snapshot reference**: The command `rbd export single-node-pool/myvolume@latest` referenced a snapshot named `@latest`, but RBD has no magic `@latest` alias. Snapshot names must be specified explicitly. Changed to `rbd export single-node-pool/myvolume@$(date +%Y%m%d)` to match the snapshot name created in the preceding line.

## Review Notes
- The trade-offs section states "one OSD failure = data loss unless using erasure coding." This is slightly misleading — erasure coding on a single node with only two OSDs would provide minimal protection and is not a common configuration. However, it is technically possible with k=1, m=1 across two OSDs, so the statement is not strictly wrong.
- The Ceph image `v18.2.0` (Reef) is current as of the post date. Reef is an active release.
- The `pg_num: "16"` setting is reasonable for a small single-node cluster; in production Ceph clusters the pg autoscaler would typically handle this, but manually setting a low value for edge deployments is a valid approach.
- The OSD recovery section recommends deleting the OSD pod directly. In practice, Rook manages OSDs via Deployments, so the pod will be recreated automatically. For a full OSD replacement on new hardware, the `rook-ceph-osd-prepare` job may also need to run, but the simplified guidance is acceptable for this context.

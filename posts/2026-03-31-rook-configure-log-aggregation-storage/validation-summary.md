# Validation Summary: How to Configure Rook-Ceph for Log Aggregation Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (RBD block storage, RGW object storage)
- Ceph CLI (radosgw-admin, ceph osd pool)
- Grafana Loki (S3-compatible storage backend)
- Elasticsearch with ECK (Elastic Cloud on Kubernetes)
- Kubernetes StorageClass and PersistentVolumeClaims
- AWS CLI (for S3 bucket creation against RGW)

## Sources Consulted
- Ceph official documentation for radosgw-admin quota management (docs.ceph.com/en/latest/radosgw/admin/)
- Ceph documentation for OSD pool operations (docs.ceph.com/en/latest/rados/operations/pools/)
- Rook documentation for RBD StorageClass configuration (rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- ECK (Elastic Cloud on Kubernetes) documentation for Elasticsearch CRD (elastic.co/guide/en/cloud-on-k8s)
- Grafana Loki documentation for storage configuration (grafana.com/docs/loki/latest/storage/)

## Issues Found

### 1. Incorrect flag in `radosgw-admin quota set` command
- **What was wrong:** The command used `--quota-type=user` which is not the documented flag. The official Ceph CLI uses `--quota-scope=user`.
- **What was changed:** Replaced `--quota-type=user` with `--quota-scope=user`.

### 2. Invalid `--enabled=true` flag on `radosgw-admin quota set`
- **What was wrong:** The `--enabled=true` flag is not a valid option for `radosgw-admin quota set`. Quotas are enabled via a separate `radosgw-admin quota enable` command.
- **What was changed:** Removed `--enabled=true` from the `quota set` command and added a separate `radosgw-admin quota enable --uid=loki --quota-scope=user` command.

### 3. Missing controller-expand-secret parameters in StorageClass
- **What was wrong:** The StorageClass sets `allowVolumeExpansion: true` but was missing the required `csi.storage.k8s.io/controller-expand-secret-name` and `csi.storage.k8s.io/controller-expand-secret-namespace` parameters. Without these, PVC expansion operations would fail.
- **What was changed:** Added `csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner` and `csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph` to the StorageClass parameters.

## Review Notes
- The Loki configuration uses `boltdb_shipper` with `shared_store: s3`, which is the Loki 2.x index format. In Loki 3.0+, `boltdb_shipper` is deprecated in favor of TSDB. Since the post does not specify a Loki version, this is not incorrect but may become outdated.
- The `ceph osd pool create log-pool 64 64` command manually specifies PG count. Newer Ceph versions (Nautilus+) support PG auto-scaling via the `pg_autoscaler` module, which is generally recommended over manual PG specification.
- The post creates the Ceph pool directly via CLI commands. A more Rook-native approach would be to use a `CephBlockPool` CRD, which lets Rook manage the pool lifecycle declaratively. Both approaches work, but the CRD approach is more idiomatic for Rook deployments.
- The `--secret-key` flag used in `radosgw-admin user create` may be an alias for `--secret` in some Ceph versions. The canonical form in official documentation is `--secret`, but `--secret-key` is widely used in tutorials and may be accepted.

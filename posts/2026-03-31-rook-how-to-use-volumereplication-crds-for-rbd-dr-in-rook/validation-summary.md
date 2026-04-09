# Validation Summary: How to Use VolumeReplication CRDs for RBD DR in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator for Ceph)
- Ceph RBD (RADOS Block Device)
- Kubernetes CRDs (VolumeReplication, VolumeReplicationClass, CephBlockPool)
- CSI Addons (kubernetes-csi-addons project)
- RBD Mirroring (asynchronous disaster recovery)

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.github.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook RBD Mirroring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Rook RBD Async DR Failover/Failback: https://rook.io/docs/rook/v1.12/Storage-Configuration/Block-Storage-RBD/rbd-async-disaster-recovery-failover-failback/
- CSI Addons VolumeReplication types (Go source): https://github.com/csi-addons/kubernetes-csi-addons/blob/main/api/replication.storage/v1alpha1/volumereplication_types.go
- CSI Addons groupversion_info.go: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/api/replication.storage/v1alpha1/groupversion_info.go
- Rook example volume-replication-class.yaml: https://github.com/rook/rook/blob/master/deploy/examples/volume-replication-class.yaml
- Rook example volume-replication.yaml: https://github.com/rook/rook/blob/master/deploy/examples/volume-replication.yaml
- Ceph RBD Mirroring documentation: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph MirrorPool.cc source (bootstrap command flags): https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/MirrorPool.cc
- Rook CRD Go types (MirroringSpec, SnapshotScheduleSpec): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go

## Issues Found

### 1. Fabricated status condition type `VolumeSynchronized`
- **What was wrong:** The replication status example showed a condition `type: VolumeSynchronized` with `reason: Healthy`. This condition type does not exist in the CSI Addons VolumeReplication API. The actual condition types defined in the codebase are `Completed`, `Degraded`, `Resyncing`, `Validated`, and `Replicating`.
- **What was changed:** Replaced the single fabricated condition with the three standard conditions (`Completed`, `Degraded`, `Resyncing`) showing the correct reasons for a successfully promoted primary volume. Also added the `message` field to match real output.
- **Why:** Readers copying this status check would look for a non-existent condition, causing confusion when debugging replication health.

### 2. Missing `apiGroup` field in VolumeReplication dataSource
- **What was wrong:** The VolumeReplication resource's `dataSource` section was missing the `apiGroup: ""` field. The underlying Go type uses `corev1.TypedLocalObjectReference` which includes this field, and Rook's official example includes it.
- **What was changed:** Added `apiGroup: ""` to the `dataSource` block.
- **Why:** While Kubernetes may default this value, including it matches the official examples and avoids potential issues with strict validation.

### 3. Prerequisites overstated imageFeatures requirements
- **What was wrong:** The prerequisites stated that `imageFeatures` must include both `journaling` and `exclusive-lock` for mirrored images. However, the post configures snapshot-based mirroring (`mirroringMode: snapshot`), which does NOT require the `journaling` feature. The `journaling` feature is only required for journal-based mirroring.
- **What was changed:** Clarified that `exclusive-lock` is required for all mirrored images, while `journaling` is only additionally required for journal-based mirroring (not snapshot-based).
- **Why:** Requiring unnecessary image features could cause confusion and adds overhead that is not needed for the snapshot-based workflow described in the post.

## Review Notes
- The API version `replication.storage.openshift.io/v1alpha1` is still current as of CSI Addons v0.14.0 (January 2025). No v1alpha2 or newer version exists yet.
- The CephBlockPool mirroring configuration (field names, structure, values) is correct and matches the Go types and official documentation.
- The RBD mirror bootstrap commands (`create` and `import` with `--site-name` and `--direction rx-only` flags) are syntactically correct per the Ceph source code.
- The VolumeReplicationClass parameters (`mirroringMode`, `schedulingInterval`, `schedulingStartTime`, secret references) all match Rook's canonical example files.
- The failover procedure (demote primary, promote secondary by changing `replicationState`) is consistent with the documented Rook DR workflow. A `resync` state also exists for failback scenarios but is not covered here, which is acceptable for the post's scope.
- The `mirroring.mode` field also supports a third value `init-only` beyond the `image` and `pool` values, but this is a niche option and its omission is fine for a tutorial.

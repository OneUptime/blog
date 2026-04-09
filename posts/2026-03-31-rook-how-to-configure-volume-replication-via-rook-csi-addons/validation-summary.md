# Validation Summary: How to Configure Volume Replication via Rook CSI-Addons

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device) mirroring
- CSI-Addons VolumeReplication and VolumeReplicationClass CRDs
- Kubernetes StorageClass configuration
- Kubernetes PersistentVolumeClaim (PVC)
- Disaster recovery / failover procedures

## Sources Consulted
- Rook official documentation — RBD Mirroring: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- CSI-Addons VolumeReplicationClass CRD source: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/apis/replication.storage/v1alpha1/volumereplicationclass_types.go
- CSI-Addons VolumeReplication CRD source: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/apis/replication.storage/v1alpha1/volumereplication_types.go
- CSI-Addons GroupVersion definition: https://github.com/csi-addons/kubernetes-csi-addons/blob/main/apis/replication.storage/v1alpha1/groupversion_info.go

## Issues Found
1. **Incorrect `imageFeatures` for snapshot-based mirroring**: The post originally specified `imageFeatures: layering,exclusive-lock,journaling` in both the prerequisites and the StorageClass YAML. The `journaling` feature is only required for journal-based mirroring, not snapshot-based mirroring (which this post configures via `mirroringMode: snapshot`). Including `journaling` adds unnecessary I/O overhead. Changed to `imageFeatures: layering,exclusive-lock` in both locations.

## Review Notes
- The API group `replication.storage.openshift.io/v1alpha1` is confirmed correct per the CSI-Addons source code.
- The `replicationState` values (`primary`, `secondary`, `resync`) are all confirmed valid enum values.
- The VolumeReplicationClass parameters (`mirroringMode`, `schedulingInterval`, `schedulingStartTime`) and secret reference parameters are correctly specified.
- The VolumeReplication `dataSource` field correctly references a PVC with `apiGroup: ""` (core API group).
- The failover and resync procedures accurately describe the standard workflow for RBD mirroring DR operations.
- The provisioner name `rook-ceph.rbd.csi.ceph.com` is correct for the default Rook operator namespace.
- Additional performance-oriented image features like `fast-diff`, `object-map`, and `deep-flatten` are recommended by Rook docs but not strictly required; their omission is acceptable for a minimal tutorial.

# Validation Summary: CSI Volume Clones vs. Volume Snapshots: Which Should You Use?

## Status
validated

## Post Type
Technical guide and comparison

## Technologies Covered

- Kubernetes
- Container Storage Interface (CSI)
- PersistentVolume and PersistentVolumeClaim
- CSI volume cloning
- VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass
- CSI volume group snapshots
- CSI external-provisioner, external-snapshotter, and snapshot controller

## Sources Consulted

- [Kubernetes: CSI Volume Cloning](https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/)
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes API: PersistentVolumeClaim v1](https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/)
- [Kubernetes CSI Developer Documentation: Data Sources](https://kubernetes-csi.github.io/docs/volume-datasources.html)
- [Kubernetes CSI Developer Documentation: Snapshot and Restore](https://kubernetes-csi.github.io/docs/snapshot-restore-feature)
- [Kubernetes CSI Developer Documentation: VolumeSnapshot API](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes CSI Developer Documentation: Volume Group Snapshot and Restore](https://kubernetes-csi.github.io/docs/group-snapshot-restore-feature.html)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)

## Issues Found

- The provisioning description said Kubernetes creates a PV and then asks the CSI provisioner to populate it. Corrected it to reflect that the provisioner resolves the data source, calls the CSI driver to create a pre-populated backend volume, and then creates the PV that represents that volume.
- The snapshot status description implied that `restoreSize`, readiness, and creation time are always present. Clarified that these status values are exposed when available because the API fields are optional and depend on information reported by the CSI snapshot path.
- The restore-capacity rule did not account for an absent `status.restoreSize` and described it as the source volume size. Clarified that the minimum applies when `restoreSize` is specified and that the field is the driver-reported minimum restore size, not a used-filesystem-byte count.

## Review Notes

- All three YAML examples are syntactically valid and use the current `v1` PVC API and `snapshot.storage.k8s.io/v1` snapshot API.
- The example StorageClass and VolumeSnapshotClass names are illustrative. Successful use requires matching installed classes and a CSI driver that supports the requested clone or snapshot operation.
- CSI volume group snapshots are beta from Kubernetes 1.32 onward and still require compatible snapshot components and driver support.
- The post correctly treats clone implementation, snapshot storage behavior, application consistency, portability, and cleanup as driver- or provider-dependent rather than Kubernetes guarantees.

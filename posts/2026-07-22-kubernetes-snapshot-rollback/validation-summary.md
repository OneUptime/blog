# Validation Summary: Why Kubernetes Cannot Restore a Snapshot In Place—and How to Roll Back Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Container Storage Interface (CSI)
- Kubernetes VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass APIs
- CSI external-provisioner and external-snapshotter
- Kubernetes Deployments and StatefulSets
- StorageClass volume binding and PersistentVolume reclaim policies
- Disaster recovery, snapshot restore, and workload cutover procedures

## Sources Consulted
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes PersistentVolumeClaim API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- [Kubernetes Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes CSI data sources](https://kubernetes-csi.github.io/docs/volume-datasources.html)
- [Kubernetes CSI snapshot and restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [CSI specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
- [CSI external-provisioner documentation](https://github.com/kubernetes-csi/external-provisioner)
- [CSI external-snapshotter VolumeSnapshot CRD](https://github.com/kubernetes-csi/external-snapshotter/blob/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml)
- [CSI external-snapshotter VolumeSnapshotContent CRD](https://github.com/kubernetes-csi/external-snapshotter/blob/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml)

## Issues Found
- The snapshot readiness explanation said the field always comes from the storage driver. For a pre-provisioned snapshot, readiness can be set to true when the driver does not support `ListSnapshots`. The text now distinguishes dynamic and pre-provisioned readiness and makes clear that neither certifies application consistency.
- The restore guidance treated `status.restoreSize` as always present. The field can be absent when the size is unknown, so the text now makes the minimum-size requirement conditional on the field being reported. It also states the volume-mode conversion exception documented by the snapshot API.
- The validation section instructed readers to mount every restored claim read-only while also requiring database crash recovery and log replay, which normally write to storage. It now separates non-mutating read-only inspection from isolated write-enabled recovery, and it correctly describes raw block volumes as devices exposed through `volumeDevices` rather than mounted filesystems.
- The cutover section could imply that `ReadWriteOnce` or `ReadWriteOncePod` prevents simultaneous writes across the old and restored PVCs. Access modes apply to each volume independently, and `ReadWriteOnce` can allow multiple Pods on the same node. The text now explicitly requires writer coordination across the two claims.
- The StatefulSet section said to retain the original PVC and create a replacement under the same ordinal-specific name, but two PVCs cannot coexist with the same namespace and name. The procedure now preserves the original data separately, accounts for StatefulSet PVC retention and PV reclaim policies, deletes the old claim, and pre-creates the restored same-name claim before restarting the Pod.

## Review Notes
Reviewed against the current Kubernetes v1.36 documentation and the stable `snapshot.storage.k8s.io/v1` API. Snapshot availability, application consistency, topology, expansion, encryption, and vendor-specific revert behavior still depend on the installed CSI driver and storage backend, as the post notes.

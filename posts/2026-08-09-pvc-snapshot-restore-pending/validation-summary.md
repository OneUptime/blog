# Validation Summary: Why Is a PVC Restored from a Kubernetes VolumeSnapshot Stuck in Pending?

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kubernetes
- Container Storage Interface (CSI)
- CSI external-provisioner and external-snapshotter
- VolumeSnapshot and VolumeSnapshotContent
- PersistentVolumeClaim and PersistentVolume
- StorageClass and WaitForFirstConsumer volume binding
- CSI topology and storage capacity tracking

## Sources Consulted

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Persistent Volumes and Storage Object in Use Protection](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#storage-object-in-use-protection)
- [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: Storage Capacity](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes API: PersistentVolumeClaim](https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/)
- [Kubernetes: Field Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: CSI Migration](https://kubernetes.io/docs/concepts/storage/volumes/#csi-migration)
- [Kubernetes CSI: Snapshot and Restore Feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI: External Provisioner](https://kubernetes-csi.github.io/docs/external-provisioner.html)
- [Kubernetes CSI: Prevent Unauthorized Volume Mode Conversion](https://kubernetes-csi.github.io/docs/prevent-volume-mode-conversion.html)
- [Kubernetes CSI: Topology](https://kubernetes-csi.github.io/docs/topology.html)
- [CSI Specification: CreateVolume](https://github.com/container-storage-interface/spec/blob/master/spec.md#createvolume)
- [CSI Specification: Timeouts](https://github.com/container-storage-interface/spec/blob/master/spec.md#timeouts)
- [CSI external-provisioner source and documentation](https://github.com/kubernetes-csi/external-provisioner)

## Issues Found

- The opening described the dynamic provisioning path as an absolute rule for a snapshot-backed PVC. It was qualified as a dynamically provisioned restore and corrected to identify the CSI external-provisioner as the component that calls the driver and creates the PV for Kubernetes to bind.
- The StorageClass driver check said the `provisioner` must always literally equal `VolumeSnapshotContent.spec.driver`. That is correct for native CSI StorageClasses, but CSI migration first translates a legacy in-tree provisioner name to its CSI driver name. The text now covers both paths.
- The PVC recreation procedure left the isolated validation Pod referencing the obsolete claim. The procedure now removes that Pod first, avoiding a stale consumer and ensuring PVC in-use protection cannot postpone deletion if the Pod was scheduled.

## Review Notes

- The `snapshot.storage.k8s.io/v1`, core `v1`, and `storage.k8s.io/v1` APIs used in the examples are current and non-deprecated.
- The `--prevent-volume-mode-conversion` behavior and annotation key are correct for current supported CSI component versions. The protection defaults to enabled in external-provisioner releases from v4.0.0 onward; the feature reached GA for Kubernetes 1.30 with the corresponding snapshot and provisioner component versions.
- `--sort-by=.metadata.creationTimestamp` sorts Event objects by their creation time, not by the time of their latest recurrence. The post correctly tells readers to inspect the displayed last-seen time to identify an actively recurring event.
- The validation Pod is correctly limited to a filesystem-mode claim, and the raw block caveat correctly directs readers to `volumeDevices` and `devicePath`.
- All external documentation links in the post returned HTTP 200 and pointed to the intended official pages at review time.

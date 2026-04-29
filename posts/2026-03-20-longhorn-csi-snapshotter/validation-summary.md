# Validation Summary: How to Configure Longhorn CSI Snapshotter - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- CSI Volume Snapshot API
- `VolumeSnapshot`, `VolumeSnapshotClass`, and `VolumeSnapshotContent`
- Longhorn `RecurringJob`

## Sources Consulted
- Longhorn: Enable CSI Snapshot Support on a Cluster: https://longhorn.io/docs/1.11.1/snapshots-and-backups/csi-snapshot-support/enable-csi-snapshot-support/
- Longhorn: CSI VolumeSnapshot Associated with Longhorn Snapshot: https://longhorn.io/docs/1.11.1/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-snapshot/
- Longhorn: CSI VolumeSnapshot Associated with Longhorn Backup: https://longhorn.io/docs/1.11.1/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-backup/
- Longhorn: Recurring Snapshots and Backups: https://longhorn.io/docs/1.11.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Kubernetes: Volume Snapshot Classes: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes: Volume Snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
- The original snapshot-controller install commands pulled manifests from the `external-snapshotter` `master` branch. Longhorn documents version-matched snapshot CRDs and controller manifests for each Longhorn release, so I replaced that step with the documented `v8.5.0` installation flow for Longhorn 1.11.1.
- The `VolumeSnapshotClass` comments incorrectly described the `type` parameter as a boolean-style backup toggle. Longhorn uses `type: snap` for local Longhorn snapshots and `type: bak` for backup-target-backed snapshots, so I corrected the comments and the best-practices section.
- The restore example did not mention that the requested PVC size must match the source volume size represented by the snapshot. I added that requirement inline to the manifest.
- The `kubectl get volumesnapshotcontent` explanation described `VolumeSnapshotContent` as underlying Longhorn resources. I corrected that wording to reflect that these are the backing Kubernetes snapshot content objects.
- The recurring-job section implied that creating a `RecurringJob` resource alone would automate the example volume and that it applied to CSI `VolumeSnapshot` resources. Longhorn recurring jobs operate on Longhorn volumes and must be assigned to a volume or PVC, so I added the supported PVC labels and clarified that the job automates Longhorn snapshots rather than Kubernetes `VolumeSnapshot` objects.

## Review Notes
- The snapshot-controller installation step is version-sensitive. Future Longhorn releases may require a different `external-snapshotter` release than the `v8.5.0` example used here for Longhorn 1.11.1.

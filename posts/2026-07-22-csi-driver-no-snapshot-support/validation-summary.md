# Validation Summary: What to Do When Your CSI Driver Does Not Support Volume Snapshots

## Status

validated

## Post Type

Technical guide and troubleshooting reference

## Technologies Covered

- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses and `WaitForFirstConsumer` volume binding
- Container Storage Interface (CSI)
- Kubernetes `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass` resources
- CSI external-snapshotter and snapshot controller
- Application-native PostgreSQL and MySQL backups
- File-level backups, storage migration, replication, and backend-native snapshots
- Kubernetes StatefulSets, PVC cloning, and PersistentVolume reclaim policies

## Sources Consulted

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI external-snapshotter](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Kubernetes CSI driver deployment model](https://kubernetes-csi.github.io/docs/deploying.html)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
- [Kubernetes CSIDriver API reference](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/)
- [Kubernetes Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes CSI Volume Cloning](https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/)
- [Kubernetes Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)
- [MySQL Backup and Recovery Types](https://dev.mysql.com/doc/refman/8.4/en/backup-types.html)

## Issues Found

- The opening described the driver as needing to implement “the CSI snapshot RPCs,” which could imply that every snapshot RPC is mandatory. Changed it to name `CreateSnapshot` and `DeleteSnapshot`, which are required with `CREATE_DELETE_SNAPSHOT`; `ListSnapshots` is optional and requires the separate `LIST_SNAPSHOTS` capability.
- The support-check guidance referred to “file or local volume mode.” Kubernetes defines `Filesystem` and `Block` as volume modes; “local” is not a volume mode. Changed the wording to accurately describe driver support that varies by backend volume type or StorageClass.
- The PVC clone comparison could be read as saying that a clone is not independent. Kubernetes defines a provisioned clone as an independent volume. Changed the text to state that independence while preserving the important warning that a clone without separate retention and failure-domain controls is not a backup strategy.
- The recovery-plan example called CSI snapshot use a “fast local rollback.” CSI snapshot restore provisions a new volume; in-place snapshot reversion is outside the CSI specification. Changed “rollback” to “recovery” to avoid implying an in-place operation.

## Review Notes

- The Bash snippet is syntactically valid, and the `kubectl get`, `--namespace`, and `-o jsonpath` usage is current. It assumes, appropriately for this procedure, that the PVC is bound to a CSI-backed PV.
- The post correctly distinguishes the cluster-level snapshot CRDs and common snapshot controller from the per-driver external-snapshotter sidecar and the CSI driver's own controller capabilities.
- The guidance on pre-provisioned snapshot handles, deletion policies, finalizers, `WaitForFirstConsumer`, reclaim policy, application consistency, and out-of-failure-domain backups matches the consulted documentation.
- The post does not pin Kubernetes, CSI, or sidecar versions. Its use of the stable `snapshot.storage.k8s.io/v1` model and current CSI capability semantics is not version-stale as of the validation date.

# Validation Summary: Can You Snapshot a PVC While It Is Mounted? Crash Consistency vs Application Consistency

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass` APIs
- Kubernetes PersistentVolumeClaims and `ReadWriteOnce` / `ReadWriteOncePod` access modes
- Container Storage Interface (CSI) snapshot and restore operations
- CSI external-snapshotter and snapshot controller
- CSI Volume Group Snapshots
- Velero v1.18 backup hooks
- Linux `fsfreeze` and journaling filesystems
- Application-consistent and crash-consistent database recovery

## Sources Consulted
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Persistent Volumes — Access Modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes)
- [Kubernetes CSI: VolumeSnapshot API reference](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes CSI: Snapshot and Restore Feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Container Storage Interface Specification — CreateSnapshot](https://github.com/container-storage-interface/spec/blob/master/spec.md#createsnapshot)
- [Container Storage Interface Specification — CreateVolumeGroupSnapshot](https://github.com/container-storage-interface/spec/blob/master/spec.md#createvolumegroupsnapshot)
- [Kubernetes CSI: Volume Group Snapshot and Restore](https://kubernetes-csi.github.io/docs/group-snapshot-restore-feature.html)
- [Kubernetes v1.36: Moving Volume Group Snapshots to GA](https://kubernetes.io/blog/2026/05/08/kubernetes-v1-36-volume-group-snapshot-ga/)
- [Velero v1.18: Backup Hooks](https://velero.io/docs/v1.18/backup-hooks/)
- [Velero v1.18 backup hook execution flow](https://github.com/velero-io/velero/blob/v1.18.0/pkg/backup/backup.go#L785-L876)
- [Velero v1.18 hook command timeout implementation](https://github.com/velero-io/velero/blob/v1.18.0/pkg/podexec/pod_command_executor.go#L64-L183)
- [util-linux `fsfreeze(8)` manual](https://man7.org/linux/man-pages/man8/fsfreeze.8.html)
- [Linux kernel ext4 journal documentation](https://docs.kernel.org/filesystems/ext4/journal.html)
- [PostgreSQL: File System Level Backup](https://www.postgresql.org/docs/current/backup-file.html)

## Issues Found
- The controlled-shutdown workflow did not mention that an offline-only driver may require the filesystem to be unmounted or the volume to be detached before snapshotting. It now tells readers to wait for any driver-required unmount or detachment.
- The capture-boundary explanation left the standard CSI signal implicit. It now distinguishes asynchronous Kubernetes reconciliation from the synchronous-until-cut CSI `CreateSnapshot` RPC, identifies `status.creationTime` on a correctly bound dynamic snapshot as the propagated cut timestamp, and retains `readyToUse` solely as restore-readiness state.
- The failure path could have allowed a snapshot whose cut time was unknown at thaw to be accepted later. It now requires such a snapshot to be discarded even if it eventually becomes ready, because a timed-out CSI request can still leave a snapshot with an unknown capture boundary.
- The hook guidance implied that a Velero post-hook always runs and that a hook timeout bounds the freeze. Velero makes neither guarantee. The post now requires an independently enforced thaw deadline, watchdog, or fail-safe in addition to the normal unfreeze post-hook.
- The `fsfreeze` description said that filesystem I/O is paused generally. It now accurately states that dirty filesystem state is flushed and new writes and other filesystem modifications are blocked, and it explicitly requires checking filesystem freeze support.
- The inspection commands could reach the cluster-scoped `VolumeSnapshotContent` lookup before binding populated its name. The surrounding instruction now says to wait for `boundVolumeSnapshotContentName` before that lookup.

## Review Notes
- The `snapshot.storage.k8s.io/v1` manifest is current and syntactically valid. The Bash inspection snippet is syntactically valid, uses the correct status field, and correctly omits a namespace for cluster-scoped `VolumeSnapshotContent`.
- As of 2026-08-09, Volume Group Snapshots are GA in Kubernetes v1.36 with `groupsnapshot.storage.k8s.io/v1`. Older clusters use earlier API versions and component requirements, so operators must check the versions installed in their cluster.
- `fsfreeze` also requires support from the mounted filesystem and sufficient privileges, commonly `CAP_SYS_ADMIN`; the post correctly directs readers to verify filesystem support, the binary, privileges, mount path, and vendor procedure.
- Online snapshot support and application recovery remain driver-, backend-, filesystem-, and application-specific; the post correctly avoids claiming that Kubernetes API success or `readyToUse: true` proves application consistency.

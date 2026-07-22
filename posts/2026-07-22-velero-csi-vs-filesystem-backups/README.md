# Velero CSI Snapshots vs. File-System Backups: Which Protects Your PVCs Better?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, CSI, VolumeSnapshot, File System Backup, Disaster Recovery

Description: Choose among Velero CSI snapshots, File System Backup, and CSI snapshot data movement for each Kubernetes volume.

---

Use Velero CSI snapshots when the driver supports them and fast point-in-time capture and restore on compatible storage are the priority. Use Velero File System Backup when storage has no usable snapshot API or the data must be restored onto a different storage implementation. Use CSI Snapshot Data Movement when you want both a storage snapshot boundary and an independently stored, more portable copy.

No method makes a running database application-consistent by itself. The correct choice is per volume, based on driver support, failure domain, data shape, permissions, RPO, and restore target.

## Compare the Data Paths

| Property | CSI snapshot | File System Backup | CSI snapshot data movement |
| --- | --- | --- | --- |
| Capture layer | CSI storage backend | files from a mounted pod volume | CSI snapshot, then data mover |
| CSI snapshot support required | yes | no | yes on source |
| Point-in-time storage image | yes | no; scan reads live files over time | yes for mover input |
| Same-backend restore speed | usually fastest | usually slower | download and provision required |
| Cross-storage portability | limited | strong | strong |
| Orphan PVC without a pod | can be snapshotted | not directly | can be snapshotted |
| Node agent required | not for plain CSI snapshots | yes | yes for built-in mover |
| Typical privilege concern | CSI driver permissions | host-path access, often root/privileged | data mover access, root and sometimes privileged |

Performance and storage efficiency remain backend-specific. A provider can implement snapshots as copy-on-write or full copies; File System Backup uses Kopia repository behavior and scans file content. Benchmark with your actual volume sizes and file counts.

## How Velero CSI Snapshots Work

For a CSI-backed PVC, Velero creates a Kubernetes `VolumeSnapshot` through its integrated CSI support. The cluster's snapshot controller creates and binds the `VolumeSnapshotContent`, and the driver's external-snapshotter sidecar calls the CSI driver to create the storage-backend snapshot. Velero backs up the Kubernetes resource metadata and records the relationship needed to restore a PVC from the snapshot.

Prerequisites include:

- snapshot CRDs and the common snapshot controller;
- a CSI driver that implements snapshot creation and restoration;
- a suitable `VolumeSnapshotClass` for that driver;
- Velero configured with the `EnableCSI` feature;
- storage credentials and provider access that remain usable during restore.

Plain CSI snapshots are attractive for large databases because capture is normally quick and independent of file count. They can also protect a bound PVC that no pod currently mounts.

Their main limitation is locality. The Kubernetes objects saved to backup storage are not the volume bytes. The actual snapshot remains in the storage system. A restore into another cluster works only if that cluster's CSI driver and identity can access the snapshot handle and satisfy provider region, topology, encryption, and account rules.

## How File System Backup Works

Velero File System Backup, or FSB, runs through the node agent and Kopia data path. It discovers selected pod volumes, reads files through the node's mounted pod-volume path, and uploads them into a backup repository. During restore, Velero creates the PVC, Kubernetes dynamically provisions its PV, and Velero populates the mounted volume before the application containers proceed.

FSB is useful for NFS, EFS, Azure Files, local persistent volumes, `emptyDir`, or other volumes without a native snapshot concept. The backup repository is independent from the source volume implementation, so the target can use a different StorageClass.

Official Velero 1.18 limitations matter:

- the volume must be mounted by a pod; an orphan PVC needs a staging pod;
- `hostPath` volumes are not supported, although local persistent volumes are;
- data is read from a live filesystem over time and is less point-in-time consistent;
- the node agent accesses kubelet volume paths and may need root or privileged operation;
- massive small-file trees and large changing database files can consume substantial CPU, memory, and time;
- target pods must be schedulable for the restore workflow to populate their volumes.

FSB can protect `emptyDir`, but that volume follows pod lifecycle and may lose incremental continuity after pod recreation. Do not assume every ephemeral path should be backed up; often it should be rebuilt instead.

## The Hybrid: CSI Snapshot Data Movement

CSI Snapshot Data Movement closes the largest gap between the two methods. Velero creates a point-in-time CSI snapshot, restores or exposes temporary access to that image, and uploads its data to object storage through a data mover. After the backup completes, Velero removes the temporary CSI snapshot.

Create a backup with the built-in mover using:

```bash
velero backup create orders-portable \
  --include-namespaces orders \
  --snapshot-move-data \
  --wait
```

Watch both the backup and its data operations:

```bash
velero backup describe orders-portable --details
kubectl -n velero get datauploads \
  -l velero.io/backup-name=orders-portable
```

The built-in mover currently uses a Kopia-backed repository. It needs the Velero node agent and a working object `BackupStorageLocation`. For cross-provider recovery, the target needs a working StorageClass with the source class's name or a restore-time storage-class mapping, but does not necessarily need the same CSI snapshot facility, because data is downloaded into a newly provisioned volume.

This portability costs time and resources. Moving terabytes is slower than leaving a native snapshot in place, repository encryption and credentials must be protected, and mover pods need capacity. It is common to retain frequent local snapshots for fast rollback and move fewer recovery points off-cluster.

## Select Volumes Deliberately

FSB and volume snapshots are mutually exclusive for the same volume in one Velero backup. With the opt-in FSB model, annotate a pod with the names of volumes to send through FSB:

```bash
kubectl -n reports annotate pod/reports-0 \
  backup.velero.io/backup-volumes=shared-files
```

Volumes not selected for FSB can be considered for snapshots when CSI support and backup options permit it. The opt-out model uses `--default-volumes-to-fs-backup` and exclusions, but broad defaults deserve careful review: a cache, service-account projection, or very large scratch tree may not belong in the recovery set.

Use resource policies or workload conventions to make selection repeatable. After each backup, inspect the detailed output and `PodVolumeBackup` resources rather than inferring the chosen method from annotations:

```bash
velero backup describe nightly-20260722020000 --details
kubectl -n velero get podvolumebackups \
  -l velero.io/backup-name=nightly-20260722020000
```

## Consistency Still Belongs to the Application

A CSI snapshot is normally crash-consistent. FSB reads files at different moments. Snapshot data movement preserves the CSI snapshot's storage point as mover input, but none coordinates a database transaction automatically.

Velero pre- and post-backup hooks can run commands in selected containers. Use database-vendor procedures, enforce timeouts, and ensure unlock or unfreeze runs after errors. Be cautious with session-scoped database locks: a hook command that exits may release the lock before Velero snapshots the PVC.

For several related PVCs, use supported CSI volume group snapshots or quiesce the complete application. Independent snapshots do not guarantee one common point.

## Choose by Recovery Scenario

Choose plain CSI snapshots when:

- the restore stays on the same compatible provider and driver;
- very low capture and restore latency is important;
- the PVC is not mounted by a pod;
- another mechanism protects against account or region failure.

Choose FSB when:

- the volume lacks CSI snapshot support;
- target storage will use a different driver;
- file-level portability matters more than snapshot speed;
- the volume is mounted and node-agent security requirements are acceptable.

Choose snapshot data movement when:

- you need point-in-time storage capture plus object-storage durability;
- migration crosses clusters or providers;
- the extra transfer time and compute are acceptable;
- the source driver can snapshot but native handles are not portable enough.

Some workloads should use two independent methods. A database may have frequent local CSI snapshots for rapid rollback, daily moved copies for disaster recovery, and continuous database-native logs for point-in-time recovery.

## Prove the Chosen Method

Test restores into a clean namespace and, for disaster recovery, another cluster. Confirm that the target StorageClass is usable, all PVCs bind, volume population finishes, the application recovers, and expected records or hashes are present. Record the newest recoverable point and elapsed time.

A “Completed” Velero backup proves that its controllers finished their workflow. Only a validated restore proves that the selected workflow protects the application.

## Official Documentation

- [Velero 1.18: CSI Snapshot Support](https://velero.io/docs/v1.18/csi/)
- [Velero 1.18: File System Backup](https://velero.io/docs/v1.18/file-system-backup)
- [Velero 1.18: CSI Snapshot Data Movement](https://velero.io/docs/v1.18/csi-snapshot-data-movement/)
- [Velero 1.18: Restore Reference](https://velero.io/docs/v1.18/restore-reference/)
- [Velero 1.18: Backup Hooks](https://velero.io/docs/v1.18/backup-hooks/)
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)

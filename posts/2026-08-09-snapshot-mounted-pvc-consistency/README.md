# Snapshotting a Mounted PVC: Crash vs Application Consistency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, PersistentVolumeClaim, Application Consistency, Backup

Description: Decide when an online CSI snapshot of a mounted PVC is safe, and coordinate crash-consistent or application-consistent recovery without corrupting workloads.

---

Kubernetes can accept a `VolumeSnapshot` request while the source PVC is mounted, but that does not guarantee that the CSI driver supports online snapshots or that the captured application state is recoverable. The storage driver and backend determine whether an attached volume can be snapped. The application determines whether the bytes at that point form a valid backup.

Treat these as separate questions:

1. **Can the storage system capture the mounted volume?** Check the CSI driver's online-snapshot support and its topology or attachment restrictions.
2. **What consistency does the captured data have?** An uncoordinated storage snapshot is generally no better than the state a machine could see after sudden power loss. Application consistency requires an application-specific recovery boundary.

Never infer either answer from `ReadWriteOnce`, a successful Kubernetes API response, or `readyToUse: true` alone.

## Mounted Does Not Mean Kubernetes Blocks the Request

A normal dynamic request names the source PVC:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: orders-online-20260809
  namespace: orders
spec:
  volumeSnapshotClassName: fast-csi-snapshots
  source:
    persistentVolumeClaimName: orders-data
```

The snapshot controller creates a `VolumeSnapshotContent`, and the driver-side external-snapshotter calls the CSI driver's `CreateSnapshot` operation. The CSI driver decides whether the underlying storage supports the request in the volume's current state.

Some drivers support snapshots of attached, actively written volumes. Others require detachment, a stopped Pod, or a provider-specific setting. Some support online snapshots for block volumes but document different behavior for file volumes. Use the exact driver and storage-backend documentation; the stable Kubernetes snapshot API deliberately does not promise one universal consistency model.

`ReadWriteOnce` means the volume can be mounted read-write by a single node, not that writes are stopped or that snapshots must be offline. `ReadWriteOncePod` restricts the mount more tightly, but it also says nothing about application consistency.

## Crash Consistency Is a Storage Boundary

A crash-consistent snapshot aims to represent blocks from a point in time without coordinating application transactions. It is comparable to the disk state after an abrupt host failure only if the provider actually gives a consistent point-in-time snapshot.

On restore, a journaling filesystem may replay its journal, and a database may replay its write-ahead or transaction log. That can produce a usable recovery, but it is application- and configuration-dependent. Crash consistency does not guarantee that:

- all acknowledged application writes were durable;
- related files were captured at one logical transaction boundary;
- buffered data outside the volume reached storage;
- several PVCs represent the same instant;
- external services, object storage, or queue state match the snapshot; or
- the application supports treating a raw filesystem copy as a backup.

An application that is explicitly designed for crash recovery may tolerate this boundary. Prove that with a restore test; do not make it an assumption in the backup policy.

## Application Consistency Requires Coordination

An application-consistent snapshot is captured after the workload reaches a documented recoverable state. Depending on the application, that may mean:

- flushing in-memory buffers and forcing a checkpoint;
- pausing or fencing new writes;
- acquiring an application-level backup lock;
- switching into a documented online-backup mode;
- completing or recording a transaction-log boundary;
- snapshotting data and log volumes together; or
- cleanly stopping the application.

Use the database, filesystem, and operator documentation for the exact version. A command copied from another database-or even another storage engine in the same product-can create a snapshot that looks healthy but cannot be recovered.

The most portable workflow is to shut down the workload cleanly, wait for any driver-required unmount or detachment, take the snapshot, and restart. Online quiescing reduces downtime but adds failure modes: a hook can time out, the snapshot can take longer than expected, or the workload can remain frozen after an automation error.

## A Failure-Safe Online Workflow

Design quiescing as a transaction with an independently enforced thaw path:

1. Confirm the CSI driver supports snapshots while the volume is attached.
2. Confirm the application supports the intended recovery method.
3. Stop background jobs, compaction, schema changes, and backup operations that would conflict.
4. Enter the application's documented backup or quiesced state.
5. Request the snapshot and record its name, source PVC UID, and start time.
6. Wait until the integration confirms that the snapshot has been cut; for a conformant dynamic CSI snapshot, this is recorded in the correctly bound snapshot's `status.creationTime`.
7. Exit backup mode in a `finally`-style path backed by an independently enforced thaw deadline or watchdog, even when snapshot creation fails. If the capture boundary was not confirmed before thaw, discard the snapshot even if it later becomes ready.
8. Wait for `readyToUse: true` before using the snapshot as a restore source.
9. Restore to a new PVC and run application recovery and integrity checks.

The subtle part is step 6. Creating the Kubernetes `VolumeSnapshot` object is asynchronous, but CSI `CreateSnapshot` must block until the snapshot is cut. For a conformant dynamically provisioned snapshot, the driver returns that point-in-time cut in `creation_time`, which the controllers propagate to `.status.creationTime`; `readyToUse` can remain false while post-cut processing finishes. Confirm the bidirectional binding and observe that cut while the workload is still quiesced. Once the cut is confirmed, do not keep a filesystem or database frozen merely waiting for `readyToUse` unless the driver explicitly documents that requirement.

If no supported integration exposes that boundary, prefer a clean shutdown or an application-native backup instead of inventing timing with `sleep`.

## Use Hooks Carefully

Backup systems such as Velero can execute pre- and post-backup hooks. Its official documentation includes an `fsfreeze` example, but that example is a mechanism, not a universal database-consistency recipe.

Before using `fsfreeze`:

- verify that the container has the required binary and privileges and that the mounted filesystem supports freezing;
- freeze the actual mounted filesystem, not an overlay or wrong path;
- set explicit hook timeouts, configure an unfreeze post-hook for the normal path, and add an independently tested fail-safe that bounds the total freeze duration if the post-hook cannot run;
- alert when either hook fails;
- understand how the backup tool orders hooks and snapshot actions; and
- test node, controller, and network failure while the filesystem is frozen.

Filesystem freeze flushes dirty filesystem state and blocks new writes and other filesystem modifications. It does not necessarily make database caches, remote dependencies, or multi-volume application state consistent. Prefer an application-native checkpoint or backup mode when one exists, optionally followed by a brief filesystem freeze if the vendor procedure calls for it.

Do not run ad hoc `fsfreeze --freeze` from a terminal during a production backup unless an independently tested watchdog or fail-safe thaw path can recover without depending on the same terminal or backup-controller session.

## Multiple PVCs Need One Recovery Boundary

Creating ordinary `VolumeSnapshot` objects in a loop does not make them simultaneous. If an application spans data, transaction-log, and metadata PVCs, writes between individual requests can leave an unrecoverable combination.

There are three defensible patterns:

1. Stop the application completely, then snapshot every required PVC while it remains stopped.
2. Hold a documented application quiesce boundary across all snapshot capture points.
3. Use CSI Volume Group Snapshots when the cluster, external-snapshotter, CSI driver, and backend support them.

The Kubernetes CSI documentation describes group snapshots as crash-consistent point-in-time copies of multiple volumes. They reduce cross-volume skew, but they do not flush application caches or coordinate state outside those volumes. Application quiescing can still be required.

Volume Group Snapshot support has separate CRDs, controller settings, sidecar versions, and driver capabilities. Do not simulate it by giving separate snapshots the same label and assuming the backend grouped them.

## Inspect What Kubernetes Actually Recorded

After a request, follow status and events without altering controller-owned fields. Once `boundVolumeSnapshotContentName` is populated, use it to inspect the content:

```bash
namespace=orders
snapshot=orders-online-20260809

kubectl -n "$namespace" get volumesnapshot "$snapshot" -o yaml
kubectl -n "$namespace" describe volumesnapshot "$snapshot"

content=$(kubectl -n "$namespace" get volumesnapshot "$snapshot" \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')
kubectl get volumesnapshotcontent "$content" -o yaml
```

Check `readyToUse`, `creationTime`, `restoreSize`, the bound content, and any error. The reported `creationTime` comes through the CSI driver and is useful evidence, but it does not certify application consistency. Record hook results and application checkpoint or log positions separately as backup metadata.

## Prove the Restore, Not Just Snapshot Creation

A green snapshot controller only proves that the storage operation completed. Restore the snapshot into a new PVC without deleting or replacing the source. Mount it in an isolated validation workload and run the application's documented recovery procedure.

Validate:

- filesystem replay or checks complete without corruption;
- the application starts using only the restored dependencies;
- transaction logs reach the expected boundary;
- records acknowledged before the backup are present according to the chosen RPO;
- cross-volume and external-system relationships are coherent; and
- a second backup succeeds after normal writes resume.

Run this exercise regularly and after driver, backend, application, or backup-controller upgrades. Consistency is an observed restore property, not a label attached to a snapshot job.

## Choose the Safest Method

Use an online crash-consistent snapshot when the driver supports it, the application explicitly supports crash recovery from storage snapshots, and restore tests meet the RPO. Use online application quiescing when a supported integration can establish and release a known backup boundary reliably. Use a clean shutdown when correctness matters more than the downtime or the online procedure is uncertain.

Choose an application-native logical or physical backup when storage snapshots cannot capture the required consistency, portability, or failure boundary. A CSI snapshot left beside the source volume is also not sufficient protection against loss of the storage account, region, encryption key, or cluster metadata.

## Official Documentation

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI: Snapshot and Restore Feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI: Volume Group Snapshot and Restore](https://kubernetes-csi.github.io/docs/group-snapshot-restore-feature.html)
- [Container Storage Interface Specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
- [Velero: Backup Hooks](https://velero.io/docs/v1.18/backup-hooks/)

## Conclusion

You can request a snapshot while a PVC is mounted, but only the CSI driver can say whether that online operation is supported, and only the application procedure can make the result application-consistent. Treat an uncoordinated snapshot as a crash-recovery candidate, use failure-safe quiesce and thaw controls for stronger consistency, coordinate every related PVC, and accept the backup only after an isolated restore succeeds.

# Why a PVC Restored from a VolumeSnapshot Appears Empty

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, PersistentVolumeClaim, Storage, Troubleshooting

Description: Diagnose an apparently empty PVC restored from a CSI VolumeSnapshot without overwriting the only recoverable copy.

---

A restored PVC that is `Bound` is not necessarily a PVC restored from the snapshot you intended. `Bound` only says that Kubernetes found or provisioned a PersistentVolume. An omitted `dataSource`, a wrong mount path, an application that initializes the disk on startup, or a snapshot of the wrong source can all produce a healthy-looking but empty filesystem.

Treat the snapshot as evidence. Stop writers, preserve the original `VolumeSnapshot` and its `VolumeSnapshotContent`, and work from a second restore while you trace the chain from snapshot to container mount.

## Confirm the Restore Request That Kubernetes Stored

A snapshot restore creates a **new** volume. The PVC must reference a ready `VolumeSnapshot` in the same namespace:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: orders-data-restore
  namespace: orders
spec:
  storageClassName: fast-csi
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 100Gi
  dataSource:
    name: orders-2026-07-22
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

Inspect the live object, not the file that was meant to be applied:

```bash
kubectl -n orders get pvc orders-data-restore -o yaml
kubectl -n orders describe pvc orders-data-restore
```

The live `spec.dataSource` must contain all three values above. If it is absent, the provisioner was asked for an ordinary empty volume. Do not patch `dataSource` into a bound PVC: the source is a provisioning-time input. Delete the disposable restore PVC and recreate it with the correct source.

Look at the PVC events. They should identify the CSI provisioner and say that the volume was provisioned from the snapshot. A successful generic provisioning event is not enough. Also verify that `storageClassName` belongs to the same CSI driver that owns the snapshot and that the requested capacity is not smaller than the snapshot's `status.restoreSize`.

## Verify the Snapshot-to-Content Binding

Check the names and readiness explicitly:

```bash
kubectl -n orders get volumesnapshot orders-2026-07-22 \
  -o custom-columns='NAME:.metadata.name,READY:.status.readyToUse,SIZE:.status.restoreSize,CONTENT:.status.boundVolumeSnapshotContentName'

content=$(kubectl -n orders get volumesnapshot orders-2026-07-22 \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')
kubectl get volumesnapshotcontent "$content" -o yaml
```

The `VolumeSnapshot` and `VolumeSnapshotContent` must point to each other. For a dynamically created snapshot, the content should show the source volume handle in `spec.source.volumeHandle`, the CSI driver in `spec.driver`, and the provider snapshot handle in `status.snapshotHandle`. `readyToUse: true` means the driver says the snapshot can be used to create a volume; it does **not** prove that the expected files were on the source or that the application was consistent.

Do not remove finalizers or edit status to force readiness. Those fields coordinate protection and reflect controller or driver observations. If the binding, handle, or driver is wrong, create or import the right snapshot instead of mutating an immutable source.

## Inspect the Volume Without Starting the Application

An init container or application entrypoint may create a fresh database, run migrations, change ownership, or delete files it does not recognize. Scale the workload down before the diagnostic restore and mount the restored claim read-only in a separate pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: inspect-orders-restore
  namespace: orders
spec:
  restartPolicy: Never
  containers:
    - name: inspect
      image: busybox:1.36
      command: ["sh", "-c", "sleep 3600"]
      volumeMounts:
        - name: restored
          mountPath: /restore
          readOnly: true
  volumes:
    - name: restored
      persistentVolumeClaim:
        claimName: orders-data-restore
        readOnly: true
```

After the pod starts:

```bash
kubectl -n orders exec inspect-orders-restore -- df -h /restore
kubectl -n orders exec inspect-orders-restore -- find /restore -maxdepth 3 -ls
```

If the access mode is `ReadWriteOnce`, make sure no other pod still uses the claim in a way the driver cannot attach. A read-only container mount does not turn every storage backend into a multi-attach volume.

This inspection separates storage contents from application behavior. If files exist here but not in the real pod, the restore worked and the problem is in the pod specification or startup path.

## Trace the Actual Mount Path

Compare the workload's claim, mount, and application configuration:

```bash
kubectl -n orders get pod orders-0 -o yaml
kubectl -n orders exec orders-0 -- mount
kubectl -n orders exec orders-0 -- df -h
```

Common path mistakes include:

- the pod still names the original or a newly generated PVC rather than the restored claim;
- the volume is mounted at `/data`, while the application writes to `/var/lib/app` in the container layer;
- `subPath: database` exposes `/restore/database`, but the files are at the volume root, or the inverse;
- a second volume mount hides a populated directory beneath it;
- the restored filesystem contains a nested directory created by an earlier mount convention;
- a raw block source was expected as a filesystem.

Kubernetes normally prevents restoring a snapshot to a different `volumeMode`. An administrator can explicitly permit conversion by annotating the `VolumeSnapshotContent` with `snapshot.storage.kubernetes.io/allow-volume-mode-change: "true"`, but that does not format or translate the captured data. Do not use mode conversion as an empty-filesystem fix unless the storage design intentionally requires it.

## Prove That the Source Data Was on the Snapshotted PVC

Work backward from the snapshot's source PVC and its PV:

```bash
kubectl -n orders get volumesnapshot orders-2026-07-22 -o yaml
kubectl -n orders get pvc orders-data -o wide
kubectl get pv "$(kubectl -n orders get pvc orders-data -o jsonpath='{.spec.volumeName}')" -o yaml
```

Check that the `persistentVolumeClaimName` was the intended claim and that the content's source volume handle corresponds to that PV. A label such as `app=orders` is not enough when a StatefulSet has `orders-data-orders-0`, `orders-data-orders-1`, and similar claims.

Then verify where the application wrote at snapshot time. Data in `emptyDir`, an ephemeral CSI volume, the image's writable layer, or another PVC is not captured by this snapshot. A snapshot taken before a database finished initialization can also be legitimately empty.

For a retained production snapshot, create another PVC from it and inspect that copy. Repeated restores producing the same tree strongly suggest that the snapshot itself captured that tree; one empty application view does not.

## Account for Consistency and Recovery Behavior

CSI provides a point-in-time storage operation, not an application transaction. A running database may need journal or WAL replay after restore. Multiple PVCs snapshotted one after another do not share one recovery point. Missing log volumes, encryption keys, tablespaces, or database metadata can make valid blocks unusable.

Use the database vendor's quiesce or backup procedure, or take a CSI volume group snapshot when the driver supports it and write-order consistency across volumes is sufficient. For the strongest portable procedure, stop the writer cleanly, snapshot every required PVC, wait for every snapshot to become ready, and only then restart it.

Do not let an automated readiness probe decide that an unrecovered database is empty and initialize it. Restore first into an isolated namespace, inspect logs, allow documented recovery to finish, and validate records or checksums before exposing the service.

## A Safe Diagnostic Order

Use this order to minimize accidental damage:

1. Stop or isolate every writer to the diagnostic PVC.
2. Confirm the live PVC contains the intended `dataSource`.
3. Confirm snapshot readiness and bidirectional content binding.
4. Compare CSI driver, StorageClass, volume mode, and requested size.
5. Read the PVC provisioning events and CSI controller logs.
6. Mount the restored PVC read-only in a minimal inspection pod.
7. Compare the on-disk tree with the workload's `mountPath`, `subPath`, and configured data directory.
8. Verify that the snapshot's source handle belongs to the intended original PV.
9. Restore a second copy before testing repairs or database recovery.
10. Only then attach a validated copy to the workload.

The key distinction is between an empty **volume**, an empty **mount view**, and an application that cannot interpret present data. Following the object chain and inspecting without startup side effects identifies which one you actually have.

## Official Documentation

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI Developer Documentation: VolumeSnapshot API](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes: CSI Volume Cloning and PVC Data Sources](https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: `snapshot.storage.kubernetes.io/allow-volume-mode-change`](https://kubernetes.io/docs/reference/labels-annotations-taints/#snapshot-storage-kubernetes-io-allow-volume-mode-change)

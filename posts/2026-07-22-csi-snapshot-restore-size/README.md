# How restoreSize Works When Recreating a PVC from a CSI Snapshot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, restoreSize, PersistentVolumeClaim, Storage Capacity

Description: Use CSI snapshot restoreSize correctly when sizing a replacement PVC and diagnosing restore capacity failures.

---

`status.restoreSize` is the minimum volume capacity Kubernetes knows is required to restore a CSI snapshot. It is not the amount of live data, the billable snapshot size, or a request to resize anything. When it is present, a new PVC created from the snapshot must request at least that much storage.

The value originates with the CSI driver. Understanding that path makes restore failures and surprising capacity values much easier to explain.

## Where the Value Comes From

For a dynamically provisioned snapshot, the CSI driver returns `size_bytes` from its `CreateSnapshot` RPC. The external snapshotter records that value on `VolumeSnapshotContent.status.restoreSize`, and the snapshot controller exposes it to namespace users as a Kubernetes quantity in `VolumeSnapshot.status.restoreSize`.

Inspect both views:

```bash
kubectl -n payments get volumesnapshot payments-hourly-042 \
  -o custom-columns='NAME:.metadata.name,READY:.status.readyToUse,RESTORE_SIZE:.status.restoreSize,CONTENT:.status.boundVolumeSnapshotContentName'

content=$(kubectl -n payments get volumesnapshot payments-hourly-042 \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')
kubectl get volumesnapshotcontent "$content" -o yaml
```

The namespaced object might display a value such as `100Gi`; the content API represents the underlying status value in bytes. Status propagation is eventually consistent, so briefly seeing the content updated before the `VolumeSnapshot` is normal.

For an imported, pre-provisioned snapshot, the driver can populate size through `ListSnapshots`. If it does not support that operation or cannot report a size, `restoreSize` can remain absent. Absence means unknown, not zero.

## Size the Restore PVC

The normal restore manifest references the ready snapshot and requests at least its reported size:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: payments-data-restore
  namespace: payments
spec:
  storageClassName: premium-csi
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 100Gi
  dataSource:
    name: payments-hourly-042
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

Kubernetes and the CSI provisioning path reject a requested volume that is smaller than a specified `restoreSize`. Requesting exactly the displayed quantity is usually the clearest choice. Requesting a larger value can work when the driver supports creating that capacity from a snapshot; normal volume and filesystem expansion rules then determine how the additional space becomes usable.

Do not request less storage merely because `du` showed only 12 GiB of files on a 100 GiB source. A block-level snapshot describes the source volume's complete addressable size, not its filesystem's used blocks. To produce a smaller destination, restore at the minimum supported size and perform a separate, application-aware migration into a smaller volume.

## Why the Restored PV Can Be Larger

Storage systems allocate in provider-specific increments. A request for `100Gi` can result in a PV whose `status.capacity.storage` is larger, provided it satisfies the claim. A StorageClass can also select a backend with its own minimum size.

Compare all three values after provisioning:

```bash
kubectl -n payments get volumesnapshot payments-hourly-042 \
  -o jsonpath='{.status.restoreSize}{"\n"}'
kubectl -n payments get pvc payments-data-restore \
  -o jsonpath='{.spec.resources.requests.storage}{"\n"}{.status.capacity.storage}{"\n"}'
kubectl get pv "$(kubectl -n payments get pvc payments-data-restore \
  -o jsonpath='{.spec.volumeName}')" -o jsonpath='{.spec.capacity.storage}{"\n"}'
```

These answer different questions:

- snapshot `restoreSize`: the reported lower bound for restoration;
- PVC request: the capacity the user asked Kubernetes to provision;
- PVC/PV capacity: the capacity Kubernetes says was provisioned.

None tells you how many application bytes are logically in use or how much incremental snapshot storage the provider bills.

## Larger Restores and Filesystem Growth

Suppose `restoreSize` is `100Gi` and the replacement PVC requests `200Gi`. The CSI driver receives a request to create a 200 GiB volume whose content source is the snapshot. Whether this succeeds depends on driver and backend capabilities.

For `volumeMode: Filesystem`, the node-side CSI workflow or Kubernetes filesystem resize path must also make the filesystem see the additional capacity. Check the claim's conditions and events, and verify inside the mounted pod:

```bash
kubectl -n payments describe pvc payments-data-restore
kubectl -n payments exec restore-inspector -- df -h /restore
```

For `volumeMode: Block`, there is no filesystem for Kubernetes to grow. The application sees a larger raw device and must understand its own on-disk layout before using the extra range.

StorageClass `allowVolumeExpansion: true` controls later edits that grow a bound PVC. It is separate from the initial ability to provision a larger volume from a snapshot. Kubernetes volume expansion supports growth, not shrinking.

## Volume Mode Is a Separate Constraint

Capacity compatibility does not imply mode compatibility. By default, a snapshot from a `Filesystem` volume must restore to `Filesystem`, and a snapshot from a `Block` volume must restore to `Block`. Kubernetes records the source mode on `VolumeSnapshotContent` and prevents unauthorized conversion.

An administrator can deliberately add `snapshot.storage.kubernetes.io/allow-volume-mode-change: "true"` to the content object. That bypasses the protection; it does not transform a filesystem into an application-ready raw block layout or vice versa. Keep the original mode unless a tested storage-specific procedure requires conversion.

Access modes are also independent of `restoreSize`. The target StorageClass and driver must support the requested `ReadWriteOnce`, `ReadWriteOncePod`, or `ReadWriteMany` behavior.

## When restoreSize Is Missing

An imported snapshot may be ready while its size remains unknown. In that case Kubernetes cannot enforce a known lower bound from snapshot status, but the CSI driver or storage backend can still reject `CreateVolume` because the capacity is too small.

Use this order:

1. Query the source volume size or provider snapshot metadata through the storage vendor's supported interface.
2. Request at least that capacity, including any provider allocation rounding.
3. Confirm the target StorageClass uses the driver named by the `VolumeSnapshotContent`.
4. Read PVC events and external-provisioner logs if the claim remains `Pending`.

Do not add a guessed `restoreSize` by editing status. Status is controller-owned, and changing it does not change the provider snapshot or what the CSI driver will accept.

## Common Misinterpretations

### “The snapshot says 1 TiB, so it stores 1 TiB”

Not necessarily. Thin provisioning, copy-on-write snapshots, compression, and incremental chains are backend features. `restoreSize` describes the complete volume size required for restoration, not physical snapshot consumption.

### “I can restore 20 GiB of files into a 25 GiB PVC”

Not when the block snapshot reports a 100 GiB restore size. File usage does not lower the block device's required geometry. Use a file-level copy, logical database export, or application migration when shrinking is required.

### “A bigger request changes the snapshot”

It does not. The snapshot remains immutable. The provisioner creates an independent destination volume with the requested capacity, populated from the snapshot.

### “Deleting the source PVC changes restoreSize”

It does not change an already created snapshot's recorded size. Whether the provider snapshot survives deletion of Kubernetes objects is controlled by the snapshot content's deletion policy and the storage backend, not by this field.

### “A bound PVC proves every byte restored correctly”

Binding proves provisioning completed. Validate the filesystem, application recovery, database records, and expected checksums before declaring a restore successful.

## A Capacity Checklist for Recovery

Before creating the replacement claim:

- wait for `status.readyToUse: true`;
- record `status.restoreSize` and the bound content name;
- verify the target StorageClass uses the same CSI driver;
- preserve the source `volumeMode`;
- request at least the restore size, allowing for provider rules;
- decide whether extra capacity must be exposed through filesystem growth;
- check namespace storage quotas for the full requested size;
- keep the snapshot until application-level validation passes.

After binding, compare requested and provisioned capacity, mount an isolated copy, and run a real recovery test. `restoreSize` is an important admission and provisioning guardrail, but it is only one part of a successful restore.

## Official Documentation

- [Kubernetes CSI Developer Documentation: VolumeSnapshot API and `restoreSize`](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Persistent Volume Claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims)
- [Kubernetes: StorageClass Volume Expansion](https://kubernetes.io/docs/concepts/storage/storage-classes/#allow-volume-expansion)
- [Kubernetes: Preventing Unauthorized Volume Mode Conversion](https://kubernetes.io/blog/2024/04/30/prevent-unauthorized-volume-mode-conversion-ga/)

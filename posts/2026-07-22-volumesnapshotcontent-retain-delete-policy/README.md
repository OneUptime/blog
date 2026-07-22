# Retain vs. Delete: Choosing a Deletion Policy for VolumeSnapshotContent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshotContent, VolumeSnapshotClass, Retention, Disaster Recovery

Description: Choose and operate CSI snapshot deletion policies without unexpectedly deleting provider snapshots or retaining them forever.

---

Use `Delete` for disposable snapshots whose lifecycle is fully owned by Kubernetes automation. Use `Retain` when the storage snapshot must survive deletion of its namespaced `VolumeSnapshot`, but pair it with an inventory and an explicit reclamation process.

The policy is powerful because it controls a real storage asset. It is also easy to confuse with a PersistentVolume reclaim policy, a backup expiration setting, or an immutability control. Those are separate mechanisms.

## The Two Objects and One Storage Snapshot

A Kubernetes CSI snapshot normally has three layers:

- `VolumeSnapshot`: the namespaced user request;
- `VolumeSnapshotContent`: the cluster-scoped object bound one-to-one to that request;
- the provider snapshot identified by the CSI `snapshotHandle`.

When a user deletes the `VolumeSnapshot`, the bound content's `spec.deletionPolicy` determines the next step:

| Policy | `VolumeSnapshotContent` | Provider snapshot |
| --- | --- | --- |
| `Delete` | deleted by the controller | deleted through the CSI driver |
| `Retain` | remains | remains |

The snapshot controller and CSI external-snapshotter coordinate this lifecycle. Finalizers prevent resources from disappearing before dependent operations finish. Removing those finalizers manually can orphan storage or bypass protection; it is not a normal cleanup technique.

## The Class Sets the Initial Policy

For dynamically created snapshots, the controller copies the policy from the selected `VolumeSnapshotClass` into the new content object:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: premium-csi-retained
driver: example.csi.storage.io
deletionPolicy: Retain
parameters:
  snapshotTier: durable
```

Both `driver` and `deletionPolicy` are required. Parameters are driver-specific and must come from that driver's documentation.

The content is the authoritative place to check the policy for an existing snapshot:

```bash
content=$(kubectl -n ledger get volumesnapshot ledger-daily-20260722 \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')
kubectl get volumesnapshotcontent "$content" \
  -o custom-columns='NAME:.metadata.name,POLICY:.spec.deletionPolicy,DRIVER:.spec.driver,HANDLE:.status.snapshotHandle'
```

Changing, deleting, or recreating the class later does not retroactively alter existing content. The API documentation explicitly warns that a class should not be treated as a post-provisioning source of truth. If an individual snapshot needs a different lifecycle, an authorized cluster administrator can patch its content policy before deletion:

```bash
kubectl patch volumesnapshotcontent "$content" --type=merge \
  -p '{"spec":{"deletionPolicy":"Retain"}}'
```

Confirm the stored value and provider handle before deleting anything.

## When Delete Is the Better Default

`Delete` fits short-lived copies such as:

- pre-upgrade rollback points with a fixed short TTL;
- CI and test-environment snapshots;
- frequent snapshots managed by a controller that owns retention;
- snapshots whose durable copy has already been moved to independent backup storage.

It reduces orphaned snapshots and storage cost. It also means that deleting a small Kubernetes object can cause an irreversible provider-side deletion. Use RBAC and admission controls so ordinary application identities cannot delete protected snapshots or modify cluster-scoped content.

Do not assume a cloud recycle bin, vault lock, or delayed deletion exists. Those are provider features, not guarantees made by the Kubernetes API. Test the exact driver and backend behavior.

## When Retain Is Worth the Operational Cost

`Retain` is appropriate when deletion of the namespace, cluster, or backup controller must not immediately remove the recovery point. Examples include:

- an investigation snapshot held under a legal or incident process;
- a handoff during cluster migration;
- a recovery point guarded by a separate approval workflow;
- a snapshot that an external catalog and retention system owns.

Retention only preserves the content object and provider snapshot when the bound `VolumeSnapshot` is deleted. It does not copy data to another region or account, prevent a storage administrator from deleting it, preserve encryption keys, or make the data application-consistent. A provider or account outage can still remove both the source and retained snapshot.

Every retained snapshot needs an owner, purpose, creation time, expiration time, driver, provider handle, encryption-key dependency, and tested restore procedure. Without that inventory, `Retain` becomes an expensive orphan generator.

## Reusing a Retained Provider Snapshot

After a retained `VolumeSnapshot` is deleted, the old `VolumeSnapshotContent` is released but is not a free object that another `VolumeSnapshot` can claim. Its immutable reference and one-to-one binding protect the original relationship.

To import the provider snapshot again, use a controlled administrator workflow:

1. Record the old content's `spec.driver`, `status.snapshotHandle`, `spec.sourceVolumeMode`, and provider metadata.
2. Confirm `spec.deletionPolicy: Retain`.
3. Delete the released content object; with `Retain`, the CSI snapshot should remain in storage.
4. Create a new pre-provisioned `VolumeSnapshotContent` that names the same provider handle and points to the new namespace and snapshot name.
5. Create the matching `VolumeSnapshot` that references that content.
6. Wait for a valid bidirectional binding and `readyToUse: true` before creating a PVC.

The import objects look like this:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotContent
metadata:
  name: ledger-import-20260722
spec:
  deletionPolicy: Retain
  driver: example.csi.storage.io
  source:
    snapshotHandle: provider-snapshot-7f3a
  sourceVolumeMode: Filesystem
  volumeSnapshotRef:
    name: ledger-imported
    namespace: recovery
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: ledger-imported
  namespace: recovery
spec:
  source:
    volumeSnapshotContentName: ledger-import-20260722
```

`VolumeSnapshotContent` is cluster-scoped even though the matching `VolumeSnapshot` is namespaced. Only an administrator should perform this import. The handle must be visible to the same CSI driver and storage identity in the target environment; a handle from another provider, inaccessible region, or different driver is not portable by itself.

## Reclaiming a Retained Snapshot

Deletion should also be deliberate. A common CSI-managed flow is to patch the released content from `Retain` to `Delete`, then delete the content and let the sidecar call `DeleteSnapshot`. Some storage systems instead require a provider-specific operation, especially if credentials or the original cluster no longer exist.

Before cleanup:

- confirm no active `VolumeSnapshot` or restore depends on the handle;
- verify backup catalog and legal-hold state;
- ensure the deletion secret referenced by the snapshot class is still available if the driver requires it;
- record an audit event;
- verify provider-side deletion after Kubernetes cleanup completes.

Do not declare success merely because the API object disappeared. Conversely, do not repeatedly issue provider deletion while the CSI controller is still reconciling it.

## Keep Other Retention Controls Separate

Several similarly named controls operate at different boundaries:

- `VolumeSnapshotContent.spec.deletionPolicy` controls content and provider snapshot cleanup after snapshot deletion.
- `PersistentVolume.spec.persistentVolumeReclaimPolicy` controls a volume after its PVC is released.
- a Velero backup `ttl` controls when that Velero backup becomes eligible for garbage collection.
- object-storage lifecycle and immutability control copied backup data.
- cloud snapshot archive, recycle-bin, or vault policies are provider-specific.

Velero also owns the lifecycle of CSI snapshots it creates. Its official CSI documentation states that when a backup expires it can patch content to `Delete` and remove the corresponding storage snapshot, even if the selected class originally used `Retain`. The backup's policy therefore matters more than reading the class in isolation.

## A Practical Policy Model

Many teams use two classes with the same driver but different intent:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: premium-csi-ephemeral
driver: example.csi.storage.io
deletionPolicy: Delete
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: premium-csi-retained
driver: example.csi.storage.io
deletionPolicy: Retain
```

The ephemeral class belongs to automation with enforced TTL. Access to the retained class is restricted and requires metadata describing owner and expiration. Do not mark both classes as default for the same driver; Kubernetes cannot choose between multiple defaults for one CSI driver.

Finally, exercise both paths in a non-production account: delete a `Delete` snapshot and verify backend removal; delete a `Retain` snapshot, import its handle, restore a PVC, validate data, and then reclaim it. A deletion policy is trustworthy only when its complete lifecycle has been tested.

## Official Documentation

- [Kubernetes: Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes: Volume Snapshot Lifecycle](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI Developer Documentation: VolumeSnapshot API](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes: Importing a Pre-existing Volume Snapshot](https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/#importing-an-existing-volume-snapshot-with-kubernetes)
- [Kubernetes CSI Developer Documentation: Snapshot Secrets](https://kubernetes-csi.github.io/docs/secrets-and-credentials-volume-snapshot-class.html)
- [Velero 1.18: CSI Snapshot Lifecycle](https://velero.io/docs/v1.18/csi/)

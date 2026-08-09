# Why Is a PVC Restored from a Kubernetes VolumeSnapshot Stuck in Pending?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, PersistentVolumeClaim, StorageClass, Troubleshooting

Description: Trace a snapshot-backed PVC that remains Pending through data-source validation, CSI provisioning, topology selection, capacity, and backend restore errors.

---

For a dynamically provisioned snapshot restore, the CSI external-provisioner asks the driver to create a new volume from the snapshot, then creates a PV for Kubernetes to bind to the PVC. `Pending` therefore does not identify one problem. It can be the expected state for a `WaitForFirstConsumer` StorageClass, or it can mean that the snapshot reference, target class, size, topology, credentials, capacity, external provisioner, CSI driver, or storage backend rejected the request.

Do not delete the source `VolumeSnapshot`, its bound `VolumeSnapshotContent`, or the original PVC while investigating. A restore creates a new volume; it does not need to replace the original. Preserve the recovery point and diagnose the new claim layer by layer.

## Start with the PVC Event

Capture the stored object and its recent events before changing anything:

```bash
namespace=orders
claim=orders-data-restore

kubectl -n "$namespace" get pvc "$claim" -o yaml
kubectl -n "$namespace" describe pvc "$claim"
claim_uid=$(kubectl -n "$namespace" get pvc "$claim" \
  -o jsonpath='{.metadata.uid}')
kubectl -n "$namespace" get events \
  --field-selector involvedObject.kind=PersistentVolumeClaim,involvedObject.name="$claim",involvedObject.uid="$claim_uid" \
  --sort-by=.metadata.creationTimestamp
```

The `describe` output is normally the fastest discriminator. Common event families include:

- `WaitForFirstConsumer`, which can be expected until a schedulable Pod uses the claim;
- `ProvisioningFailed`, with the CSI or API validation reason;
- a missing `VolumeSnapshot` or unsupported data source;
- a requested size below the snapshot's restore size;
- no available topology or capacity; and
- driver-specific `CreateVolume` failures.

Record the exact event message, count, and last-seen time. Repeated events whose last-seen time continues to advance usually show the active blocker; an old event may describe a condition that has already changed.

## Verify That This Is Actually a Snapshot Restore

The PVC must contain the snapshot reference that the API server stored:

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
  resources:
    requests:
      storage: 100Gi
  dataSource:
    apiGroup: snapshot.storage.k8s.io
    kind: VolumeSnapshot
    name: orders-db-before-upgrade
```

For this standard `dataSource` form, the PVC and `VolumeSnapshot` are in the same namespace. Check spelling, capitalization, and `apiGroup`; `kind: VolumeSnapshot` without `apiGroup: snapshot.storage.k8s.io` is not the same reference.

```bash
kubectl -n "$namespace" get pvc "$claim" \
  -o jsonpath='{.spec.dataSource}{"\n"}'
```

If `dataSource` is missing, the provisioner may create an ordinary empty volume instead of a restore. Stop rather than allowing a workload to initialize that volume and hide the mistake. Fields such as `dataSource` and `storageClassName` are not normal repair-in-place controls; after correcting the manifest, create a new diagnostic PVC with a new name.

## Prove the Snapshot Is Ready and Bound

Follow the namespaced snapshot to its cluster-scoped content:

```bash
snapshot=orders-db-before-upgrade

kubectl -n "$namespace" get volumesnapshot "$snapshot" -o yaml
content=$(kubectl -n "$namespace" get volumesnapshot "$snapshot" \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')
kubectl get volumesnapshotcontent "$content" -o yaml
```

Confirm all of the following:

- `status.readyToUse` is `true`;
- `status.boundVolumeSnapshotContentName` is populated;
- the content's `spec.volumeSnapshotRef` name, namespace, and UID match the snapshot;
- `status.snapshotHandle` is present on the content;
- no current `status.error` is reported; and
- the backend snapshot still exists and is accessible to the CSI driver.

Do not patch readiness, the binding, or the snapshot handle. Those fields describe controller and driver state. If readiness is not `true`, troubleshoot snapshot creation before troubleshooting restore provisioning.

## Match the StorageClass to the Snapshot Driver

The target PVC's `StorageClass` controls which external provisioner and CSI driver receive the restore request:

```bash
storage_class=$(kubectl -n "$namespace" get pvc "$claim" \
  -o jsonpath='{.spec.storageClassName}')

kubectl get storageclass "$storage_class" -o yaml
kubectl get volumesnapshotcontent "$content" \
  -o jsonpath='{.spec.driver}{"\n"}'
```

For a native CSI StorageClass, its `provisioner` must exactly match `VolumeSnapshotContent.spec.driver`. If CSI migration is involved, the external-provisioner first translates the legacy in-tree provisioner name to its CSI driver name before this comparison. In either case, that CSI driver must be able to consume the snapshot handle. A similarly named class backed by another driver cannot translate the handle. A class in another region, account, project, or storage system may use the same driver name yet still lack access to the snapshot; check the provider's documented scope.

Driver parameters also matter. Encryption keys, filesystem type, volume type, replication mode, and topology settings can make a target incompatible even when the driver name matches. Compare with a known-good restore example from the specific CSI driver, not just an ordinary blank-volume PVC.

## Check Size and Volume Mode

The requested PVC capacity must not be smaller than the snapshot's `status.restoreSize` when that field is reported:

```bash
kubectl -n "$namespace" get volumesnapshot "$snapshot" \
  -o jsonpath='{.status.restoreSize}{"\n"}'
kubectl -n "$namespace" get pvc "$claim" \
  -o jsonpath='{.spec.resources.requests.storage}{"\n"}'
```

`restoreSize` is a minimum restore capacity, not the live bytes used in the filesystem. Request that size or a supported larger size. A larger request also depends on the CSI driver's create-from-snapshot and expansion behavior.

Check the content's `spec.sourceVolumeMode` and the PVC's `spec.volumeMode`. When `sourceVolumeMode` is populated and the CSI external-provisioner runs with `--prevent-volume-mode-conversion=true` (the default in supported releases), the external-provisioner rejects a restore that changes `Filesystem` to `Block` or the reverse. An administrator can allow the change by adding `snapshot.storage.kubernetes.io/allow-volume-mode-change: "true"` to the `VolumeSnapshotContent`, and only when the storage driver actually supports the result. For pre-provisioned content, the administrator must populate `spec.sourceVolumeMode`; if it is absent, the source mode is unknown. Do not add the annotation merely to suppress an error.

Access modes must also be accepted by the target driver and class. They are not inferred from the snapshot data.

## Recognize WaitForFirstConsumer

A StorageClass with this setting deliberately delays volume provisioning:

```yaml
volumeBindingMode: WaitForFirstConsumer
```

The PVC can remain `Pending` until a schedulable Pod references it, allowing Kubernetes to choose a compatible zone or node topology. For the filesystem-mode PVC shown above, create an isolated validation Pod rather than starting the production application:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: inspect-orders-restore
  namespace: orders
spec:
  containers:
    - name: inspect
      image: busybox:1.36
      command: ["sh", "-c", "sleep 86400"]
      volumeMounts:
        - name: restored
          mountPath: /restore
          readOnly: true
  volumes:
    - name: restored
      persistentVolumeClaim:
        claimName: orders-data-restore
```

This Pod uses `volumeMounts` and does not work for a raw `Block` PVC. A block-mode claim requires `volumeDevices` with a `devicePath` instead.

Apply only after reviewing image and security policy for the cluster. Do not set `spec.nodeName`; Kubernetes documentation warns that bypassing the scheduler this way can leave a `WaitForFirstConsumer` PVC pending. Use supported node affinity or a node selector if you must constrain placement.

Then inspect both Pod and PVC events. Unsatisfied node selectors or resource requests, untolerated taints, incompatible allowed topologies, and, when CSI capacity tracking is enabled, insufficient reported storage capacity can prevent the scheduler from selecting a consumer topology.

## Follow the Provisioning Control Path

Snapshot restore provisioning normally crosses these components:

```text
PVC -> external-provisioner -> CSI CreateVolume
    -> storage backend creates volume from snapshot handle -> PV -> binding
```

Locate the CSI controller workload and its external-provisioner sidecar:

```bash
kubectl get csidrivers
kubectl get pods --all-namespaces \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,CONTAINERS:.spec.containers[*].name,IMAGES:.spec.containers[*].image' \
  | grep -E 'csi|provision'
```

Use the actual driver namespace rather than assuming `kube-system`. Inspect logs for the PVC UID, claim namespace/name, snapshot handle, and the `CreateVolume` response. Check both the external-provisioner container and the CSI driver container around the same timestamp.

If ordinary PVCs provision but snapshot restores do not, verify the deployed external-provisioner and driver versions against the vendor's compatibility matrix. The driver must support creating a volume from a snapshot; installing snapshot CRDs alone does not add that capability.

Backend errors commonly point to:

- a missing or deleted snapshot handle;
- credentials that can create empty volumes but cannot read the snapshot or encryption key;
- snapshot and target volume in incompatible regions, zones, pools, or accounts;
- exhausted quota, capacity, or provider limits;
- unsupported requested volume type or size; and
- a transient backend operation still in progress.

Use the provider console or API read-only to corroborate the handle and operation. Do not create an unrelated blank volume manually and bind it to the claim.

## Retry Without Endangering the Recovery Point

After correcting topology, permissions, driver configuration, or a transient backend condition, first allow the provisioner to retry. Controllers normally retry transient provisioning failures. If the class, requested size, data source, access modes, or volume mode is wrong on this `Pending` claim, recreate the PVC as described below.

If the PVC manifest itself is wrong and must be recreated:

1. Confirm that no PV or backend volume was created for the failed attempt and that no backend create operation remains in flight.
2. Keep the source `VolumeSnapshot`, content, and original PVC unchanged.
3. Delete any isolated validation Pod that references the failed claim, then delete only the failed restore PVC after recording its UID and events.
4. Create a corrected PVC under a new diagnostic name.
5. Mount it in an isolated validation Pod before application cutover.

Provider operations can outlive CSI timeouts and Kubernetes objects. Verify the backend inventory before deleting and recreating the claim; the new PVC has a new provisioning identity, so an earlier in-flight operation can later complete as a chargeable orphan.

## Official Documentation

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Persistent Volumes and Claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Storage Classes and WaitForFirstConsumer](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes CSI: Snapshot and Restore Feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI: External Provisioner](https://kubernetes-csi.github.io/docs/external-provisioner.html)

## Conclusion

A snapshot-backed PVC stays Pending at the first incomplete layer: the stored data source, ready snapshot binding, compatible StorageClass, size and volume mode, consumer topology, CSI provisioning path, or backend restore. Start with PVC events, trace the recorded objects rather than patching status, and test a corrected restore under a new claim while preserving the original data and snapshot.

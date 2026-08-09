# VolumeSnapshot Stuck Terminating: Diagnose Finalizers Before Removal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, VolumeSnapshotContent, Finalizer, Storage, Troubleshooting

Description: Trace a terminating VolumeSnapshot through restore protection, content deletion, the CSI snapshotter, credentials, and backend cleanup before considering manual finalizer removal.

---

A `VolumeSnapshot` that remains after `kubectl delete` is usually not waiting for a grace period. The API server has accepted the deletion, set `metadata.deletionTimestamp`, and is waiting for one or more controllers to remove their finalizers after storage work is safe and complete.

Those finalizers protect real data. Removing one without understanding what it guards can interrupt a PVC restore, orphan a billable provider snapshot, or make Kubernetes forget the handle needed to delete that snapshot later. Diagnose the controller chain first; manual removal is a recovery action, not a routine delete option.

## Prove That Deletion Is Waiting on a Finalizer

Capture the object before changing anything:

```bash
snapshot_namespace=payments
snapshot_name=payments-before-upgrade

kubectl -n "$snapshot_namespace" get volumesnapshot "$snapshot_name" -o json |
  jq '{
    name: .metadata.name,
    uid: .metadata.uid,
    deletionTimestamp: .metadata.deletionTimestamp,
    finalizers: .metadata.finalizers,
    source: .spec.source,
    class: .spec.volumeSnapshotClassName,
    boundContent: .status.boundVolumeSnapshotContentName,
    readyToUse: .status.readyToUse,
    error: .status.error,
    group: .status.volumeGroupSnapshotName
  }'

kubectl -n "$snapshot_namespace" describe volumesnapshot "$snapshot_name"
```

If `deletionTimestamp` is null, the object is not in finalization. Check whether the delete request was rejected by RBAC, an admission policy, or a validating webhook. If the timestamp is set, inspect every finalizer. Current external-snapshotter releases can use these keys:

- `snapshot.storage.kubernetes.io/volumesnapshot-as-source-protection` protects a snapshot while a pending PVC is being created from it.
- `snapshot.storage.kubernetes.io/volumesnapshot-bound-protection` keeps a bound snapshot whose matching content has `deletionPolicy: Delete` until its content deletion is complete.
- `snapshot.storage.kubernetes.io/volumesnapshotcontent-bound-protection` appears on the cluster-scoped `VolumeSnapshotContent`; the CSI snapshotter removes it after the required provider-side work.
- `snapshot.storage.kubernetes.io/volumesnapshot-in-group-protection` can appear when the optional volume group snapshot feature manages the member snapshot.

Names and group-snapshot behavior are implementation details of the installed external-snapshotter release. Inspect the actual object and use documentation matching the CRDs, snapshot controller, sidecar, CSI driver, and Kubernetes distribution you run.

## Map the VolumeSnapshot to Its Content

Resolve the bound content from status:

```bash
snapshot_content=$(kubectl -n "$snapshot_namespace" get volumesnapshot "$snapshot_name" \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

kubectl get volumesnapshotcontent "$snapshot_content" -o json |
  jq '{
    name: .metadata.name,
    deletionTimestamp: .metadata.deletionTimestamp,
    finalizers: .metadata.finalizers,
    annotations: .metadata.annotations,
    policy: .spec.deletionPolicy,
    driver: .spec.driver,
    snapshotRef: .spec.volumeSnapshotRef,
    source: .spec.source,
    snapshotHandle: .status.snapshotHandle,
    readyToUse: .status.readyToUse,
    error: .status.error
  }'

kubectl describe volumesnapshotcontent "$snapshot_content"
```

If snapshot status never recorded the content name, search by the immutable snapshot UID rather than guessing from a display name:

```bash
snapshot_uid=$(kubectl -n "$snapshot_namespace" get volumesnapshot "$snapshot_name" \
  -o jsonpath='{.metadata.uid}')

kubectl get volumesnapshotcontent -o json |
  jq -r --arg uid "$snapshot_uid" \
    '.items[] | select(.spec.volumeSnapshotRef.uid == $uid) | .metadata.name'
```

Verify that the content reference points back to the snapshot's name, namespace, and UID. The controller requires a valid bidirectional binding before it performs destructive cascading work. Do not patch a mismatched UID merely to force deletion; the guard exists to prevent one snapshot request from deleting another snapshot's storage asset.

## Understand the Expected Deletion Chain

For an independent snapshot that is not a group member, `deletionPolicy: Delete` normally crosses two controllers:

1. The common snapshot controller sees the `VolumeSnapshot` deletion timestamp.
2. It verifies that no pending PVC restore still uses the snapshot.
3. It marks and deletes the bound `VolumeSnapshotContent`.
4. The CSI external-snapshotter sidecar that owns `spec.driver` sees the content deletion.
5. The sidecar calls the CSI driver's `DeleteSnapshot` operation.
6. After success, it clears the snapshot-related fields from `VolumeSnapshotContent.status` and removes the content finalizer.
7. The content disappears; the common controller can then remove the snapshot's bound finalizer.
8. The API server finally removes the `VolumeSnapshot`.

With `deletionPolicy: Retain`, deleting the namespaced object should leave both the `VolumeSnapshotContent` and provider snapshot. The common controller does not wait for provider deletion because none was requested. A retained content object is not evidence that the namespaced snapshot is still terminating.

This distinction tells you where to look. A `Delete` snapshot with both objects terminating is usually blocked in the CSI sidecar or driver. A snapshot carrying only source protection is usually blocked by a restore. A `Retain` snapshot stuck without an active restore points more strongly to the common controller, its RBAC, or an unrelated finalizer.

## Check for a Pending PVC Restore

The source-protection finalizer exists because deleting a recovery point while a new volume is still provisioning from it can leave an incomplete volume. List PVC references and their phases:

```bash
kubectl -n "$snapshot_namespace" get pvc -o json |
  jq -r --arg snapshot "$snapshot_name" '
    .items[] |
    select(
      (.spec.dataSource.apiGroup == "snapshot.storage.k8s.io" and
       .spec.dataSource.kind == "VolumeSnapshot" and
       .spec.dataSource.name == $snapshot) or
      (.spec.dataSourceRef.apiGroup == "snapshot.storage.k8s.io" and
       .spec.dataSourceRef.kind == "VolumeSnapshot" and
       .spec.dataSourceRef.name == $snapshot)
    ) |
    [.metadata.name, .status.phase, (.metadata.deletionTimestamp // "-")] |
    @tsv'
```

For the normal same-namespace restore path, the snapshot controller blocks while a matching PVC is `Pending`. Fix that PVC's provisioning problem or deliberately cancel the restore by deleting the pending PVC. Do not remove source protection while provisioning is active. A bound PVC no longer represents an in-progress creation, even though its immutable `dataSource` still names the snapshot.

Cross-namespace `dataSourceRef` support, including which controller observes it, is version and feature dependent. Follow the documentation for the exact Kubernetes release and CSI stack rather than assuming a cross-namespace reference behaves like the GA same-namespace path.

If `.status.volumeGroupSnapshotName` is set, inspect the owning `VolumeGroupSnapshot`. In releases that support group snapshots, individual member deletion is intentionally blocked while the group exists; delete or repair the group through its supported lifecycle instead of stripping the member finalizer.

## Find the Controller That Stopped Reconciling

The common snapshot controller is normally installed once per cluster by the Kubernetes distribution. A `csi-snapshotter` sidecar normally runs with each snapshot-capable CSI controller. Locate both without assuming a namespace or Pod label:

```bash
kubectl get pods -A -o json |
  jq -r '
    .items[] |
    select(any(.spec.containers[]?;
      .name == "snapshot-controller" or .name == "csi-snapshotter")) |
    [.metadata.namespace, .metadata.name,
     ([.spec.containers[].name] | join(",")), .status.phase] |
    @tsv'
```

Read the relevant current container logs from the discovered Pods:

```bash
kubectl -n SNAPSHOT_CONTROLLER_NAMESPACE logs SNAPSHOT_CONTROLLER_POD \
  -c snapshot-controller --since=1h

kubectl -n CSI_DRIVER_NAMESPACE logs CSI_CONTROLLER_POD \
  -c csi-snapshotter --since=1h
```

After a container restart, repeat the relevant command with `--previous` to read logs from the immediately previous container instance in that Pod.

In a replicated controller deployment, inspect the leader's logs as well as restarts and leader-election events. Common blockers include:

- the snapshot controller is missing, crash-looping, or unable to update finalizers because of RBAC;
- the CSI driver was removed or its sidecar does not claim the content's exact `spec.driver` value;
- the snapshot controller, CRDs, and sidecar versions are incompatible after an upgrade;
- the CSI `DeleteSnapshot` call times out or returns a provider error;
- the provider refuses deletion because the snapshot has a dependency or is busy;
- the sidecar cannot read the deletion Secret named in content annotations;
- the API server rejects status or finalizer updates because of an invalid legacy object or webhook problem.

Events often identify the failing edge directly. Look for reasons such as `SnapshotDeletePending`, `SnapshotContentObjectDeleteError`, and `SnapshotDeleteError`:

```bash
kubectl -n "$snapshot_namespace" get events \
  --field-selector involvedObject.kind=VolumeSnapshot,involvedObject.name="$snapshot_name" \
  --sort-by=.lastTimestamp

kubectl get events -A --sort-by=.lastTimestamp |
  rg "$snapshot_name${snapshot_content:+|$snapshot_content}|SnapshotDelete"
```

If the content annotations reference a deletion Secret, verify only that the named Secret exists and that the sidecar's ServiceAccount can read it. Do not print secret data into a ticket or terminal transcript. Restore missing credentials through the driver's documented procedure and let the controller retry.

Also inspect `snapshot.storage.kubernetes.io/volumesnapshot-being-created` on the content. Current sidecar logic intentionally postpones deletion while an earlier `CreateSnapshot` call has no recorded success or failure. Repair the CSI controller or provider call; deleting that annotation by hand can race an operation whose outcome is still unknown.

## Repair the Owner, Not the Symptom

Prefer these recovery actions, in order:

1. Let a pending restore finish, or safely cancel and delete its pending PVC.
2. Restore the distribution-managed snapshot controller and its documented RBAC.
3. Restore the correct CSI controller and compatible `csi-snapshotter` sidecar.
4. Repair deletion credentials, provider permissions, connectivity, or backend dependencies.
5. Resolve supported version skew using the external-snapshotter compatibility guidance and your distribution's upgrade path.
6. Wait for reconciliation and verify the backend snapshot state.

Do not install manifests from the external-snapshotter repository's default branch blindly into a managed cluster. The distribution owns the CRDs and common controller, and an arbitrary newest controller can be incompatible with the installed APIs or CSI driver.

`kubectl delete --force --grace-period=0` does not remove finalizers from an ordinary `VolumeSnapshot` or perform storage cleanup. Finalizers are not Pod grace periods, and removal of an API object alone never proves that the backend snapshot was deleted.

## When Manual Finalizer Removal Is Defensible

Manual removal is a last-resort administrative decision when the owning controller cannot be restored in a reasonable time. Before doing it, prove and record all of the following:

- no pending PVC is being created from the snapshot;
- no group snapshot still owns the member;
- the snapshot and content YAML, UIDs, deletion policy, driver, and provider handle are saved securely;
- for `Delete`, the provider snapshot is already absent, or the team explicitly accepts and inventories an orphan for later provider-side deletion;
- for `Retain`, the surviving content and provider snapshot are intentionally cataloged;
- every remaining finalizer and its owning controller is understood.

Remove only the audited finalizer and preserve unrelated ones. This example builds the remaining list instead of replacing it with an empty array:

```bash
finalizer_to_remove='snapshot.storage.kubernetes.io/volumesnapshot-as-source-protection'

remaining_finalizers=$(
  kubectl -n "$snapshot_namespace" get volumesnapshot "$snapshot_name" -o json |
    jq -c --arg finalizer "$finalizer_to_remove" \
      '[.metadata.finalizers[]? | select(. != $finalizer)]'
)

kubectl -n "$snapshot_namespace" patch volumesnapshot "$snapshot_name" \
  --type=merge \
  -p "{\"metadata\":{\"finalizers\":${remaining_finalizers}}}"
```

Do not copy that command until the named finalizer matches the verified blocker. Removing `volumesnapshotcontent-bound-protection` is higher risk: if `DeleteSnapshot` has not succeeded, Kubernetes can lose the last managed reference while the provider asset and cost remain. A storage administrator should remove a content finalizer only after verifying provider state and documenting the orphan or completed deletion.

After any emergency patch, confirm the API objects, provider snapshot inventory, backup catalog, and storage bill agree. Create and delete a disposable snapshot to prove the repaired controller path works before returning automation to service.

## Official Documentation

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Volume Snapshot Classes and deletion policy](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes CSI snapshot and restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature)
- [Kubernetes CSI external-snapshotter](https://github.com/kubernetes-csi/external-snapshotter)
- [CSI `DeleteSnapshot` specification](https://github.com/container-storage-interface/spec/blob/master/spec.md#deletesnapshot)

## Conclusion

A terminating `VolumeSnapshot` is a storage workflow in progress, not an object that merely needs a stronger delete command. Identify its finalizer, follow the binding to `VolumeSnapshotContent`, check pending restores, then trace reconciliation through the common snapshot controller, CSI sidecar, driver, credentials, and provider. Restore that chain whenever possible. Remove a finalizer only after proving what it protects has completed or after explicitly accepting and inventorying the storage orphan it can create.

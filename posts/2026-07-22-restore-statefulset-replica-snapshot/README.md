# How to Restore One StatefulSet Replica from a VolumeSnapshot Without Losing Its PVC Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, CSI, Volume Snapshots, Disaster Recovery

Description: Restore one StatefulSet ordinal by recreating its PVC from a snapshot under the exact stable claim name the controller expects.

---

A StatefulSet does not attach any interchangeable claim to any replica. Each `volumeClaimTemplate` and Pod ordinal produce a stable PVC name. If the template is `data`, the StatefulSet is `orders-db`, and the ordinal is `2`, the expected claim is `data-orders-db-2`.

To restore that replica, stop the controller from recreating the Pod, validate the recovery separately, remove the old claim safely, and create a snapshot-backed PVC with that exact name. The new PV, CSI volume handle, and recreated PVC's UID will differ; what remains stable is the PVC name and ordinal relationship the StatefulSet expects.

## Decide whether a replica restore is valid

Storage recovery and distributed-system recovery are not the same operation. An old replica image can contain a stale member ID, cluster epoch, replication slot, consensus term, or transaction timeline. Starting it beside current peers can cause rejection, split-brain risk, or corruption.

Before touching Kubernetes objects, follow the application's recovery procedure. Depending on the system, the correct operation may be to remove the failed member and let a new empty replica resynchronize from the leader instead of restoring an old snapshot.

Use a snapshot restore only when the database, operator, or application documentation supports it. Quorum, fencing, point-in-time logs, and member re-registration are application concerns.

Also identify every claim attached to the ordinal. If the Pod has separate data, WAL, and configuration claim templates, restoring only one point in time may produce an inconsistent set. A storage-level snapshot is normally crash-consistent unless the application and driver coordinate a stronger boundary.

## Resolve the exact PVC identity

Record the StatefulSet and template names:

```bash
NAMESPACE=database
STATEFULSET=orders-db
ORDINAL=2

kubectl get statefulset "$STATEFULSET" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{range .spec.volumeClaimTemplates[*]}{.metadata.name}{"\n"}{end}'
```

For template `data`, derive and inspect the claim:

```bash
PVC_NAME="data-${STATEFULSET}-${ORDINAL}"

kubectl get pvc "$PVC_NAME" --namespace "$NAMESPACE" -o yaml
```

The usual naming rule applies to default ordinals and also remains based on the actual Pod ordinal when `.spec.ordinals.start` is configured. Confirm the live Pod's mounted claims rather than relying only on mental arithmetic:

```bash
kubectl get pod "${STATEFULSET}-${ORDINAL}" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{range .spec.volumes[?(@.persistentVolumeClaim)]}{.name}{"="}{.persistentVolumeClaim.claimName}{"\n"}{end}'
```

Record the claim's StorageClass, access modes, volume mode, requested size, bound PV, labels, and annotations. Generate a clean restore manifest later; do not reapply exported binding metadata such as `volumeName`, `resourceVersion`, `uid`, finalizers, or status.

## Protect claims before scaling down

Inspect the StatefulSet's retention policy:

```bash
kubectl get statefulset "$STATEFULSET" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.persistentVolumeClaimRetentionPolicy}{"\n"}'
```

When the field is absent, historical and default behavior is `Retain`. If `whenScaled` is `Delete`, scaling down causes PVCs for removed ordinals to be garbage-collected after their Pods terminate. Change the declared policy to `Retain` through the workload's normal management system and wait for it to reconcile before the maintenance operation:

```yaml
spec:
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: Retain
    whenScaled: Retain
```

If an operator or GitOps controller owns the StatefulSet, use its maintenance and configuration APIs. A manual patch can be immediately reversed by reconciliation.

Create and verify a current-state backup before rollback. Prefer a `VolumeSnapshotClass` with `deletionPolicy: Retain` for this safety copy, and wait for `readyToUse: true`. This is separate from the older snapshot you intend to restore.

## Stop the target ordinal without a race

Deleting only `orders-db-2` is insufficient: the StatefulSet controller immediately recreates the desired Pod and reattaches its existing claim.

Record the original desired replica count before changing it:

```bash
ORIGINAL_REPLICAS=$(kubectl get statefulset "$STATEFULSET" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.replicas}')

printf '%s\n' "$ORIGINAL_REPLICAS"
```

If the target is the highest ordinal, reduce the desired replica count so that the target falls outside the desired ordinal range. The replica count is a count, not an ordinal: with start ordinal `S` and target ordinal `T`, set replicas to `T-S` or lower. For a three-replica set with the default start ordinal targeting ordinal 2:

```bash
kubectl scale statefulset "$STATEFULSET" \
  --namespace "$NAMESPACE" \
  --replicas=2
```

StatefulSets scale down from the highest ordinal. To create a hole at a middle or lower ordinal, a generic StatefulSet has no per-replica pause. Reduce the desired range through the target, knowing that all greater ordinals also stop, or use the conservative workflow of scaling the set to zero. Coordinate quorum and availability with the application owner.

Horizontal autoscalers and operators can undo manual scaling. Suspend their reconciliation through supported controls. With the default `OrderedReady` policy, scale-down can stall while any managed Pod is unhealthy; if that happens, use the workload owner's supported maintenance or recovery procedure rather than forcing the operation. Wait until the target Pod is fully gone and the volume is detached; do not force-delete it to bypass storage protection.

## Restore and validate under a temporary name

Before replacing the stable claim, create a temporary PVC from the selected snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-orders-db-2-restore-check
  namespace: database
spec:
  storageClassName: production-block
  dataSource:
    name: orders-db-2-known-good
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 200Gi
```

Use a StorageClass backed by the snapshot's CSI driver, the source claim's real modes, and a capacity at least as large as the snapshot's `restoreSize`. With the `dataSource` form shown here, the `VolumeSnapshot` must be in the same namespace as the PVC and report `readyToUse: true`. Mount a filesystem-mode temporary claim read-only in an isolated Pod; for raw block mode, expose it through `volumeDevices` and use non-destructive validation tooling. Run filesystem, database, version, and recovery-point checks without allowing it to join the live cluster or process production work.

This step catches the wrong snapshot, missing encryption key, corrupt recovery point, and incompatible application version before the ordinal's stable name is disturbed.

## Preserve the old backend volume

The old PV may have reclaim policy `Delete`. If you need a second rollback path after deleting its claim, change that PV to `Retain` first:

```bash
OLD_PV=$(kubectl get pvc "$PVC_NAME" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.volumeName}')

kubectl get pv "$OLD_PV" \
  -o jsonpath='{.spec.persistentVolumeReclaimPolicy}{"\n"}'

kubectl patch pv "$OLD_PV" \
  --type=merge \
  -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```

Record the old PV name, CSI volume handle, original reclaim policy, and ownership. With `Retain`, deleting the PVC releases rather than deletes the backend volume, but reusing it later requires administrator-led recovery. The independently verified current-state snapshot is usually the simpler rollback source.

## Recreate the exact claim from the snapshot

Delete the stopped replica's old claim and wait for it to disappear:

```bash
kubectl delete pvc "$PVC_NAME" --namespace "$NAMESPACE"
kubectl wait --for=delete "pvc/${PVC_NAME}" \
  --namespace "$NAMESPACE" \
  --timeout=5m
```

If deletion is stuck, check for a remaining Pod using the claim and respect PVC protection. Do not remove finalizers.

Now create a clean PVC with the exact stable name:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-orders-db-2
  namespace: database
  labels:
    app.kubernetes.io/name: orders-db
    recovery.oneuptime.com/source-snapshot: orders-db-2-known-good
spec:
  storageClassName: production-block
  dataSource:
    name: orders-db-2-known-good
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 200Gi
```

Ensure template-required labels and annotations are present, but omit controller-populated fields. If the StorageClass uses `WaitForFirstConsumer`, the claim may stay `Pending` until the StatefulSet Pod is scheduled. That is expected.

Optionally attach or mount this exact claim read-only, where supported, in a temporary Pod for a final check, then delete that Pod and wait for detachment before scaling up. With `WaitForFirstConsumer`, the validation Pod must reproduce the target StatefulSet Pod's scheduling constraints so that provisioning selects compatible topology; otherwise, let the StatefulSet Pod be the first consumer.

## Bring the replica back under application control

Restore the original replica count through the owner of the workload:

```bash
kubectl scale statefulset "$STATEFULSET" \
  --namespace "$NAMESPACE" \
  --replicas="$ORIGINAL_REPLICAS"
```

Watch the target Pod, PVC, and events:

```bash
kubectl get pod "${STATEFULSET}-${ORDINAL}" \
  --namespace "$NAMESPACE" \
  --watch

kubectl describe pvc "$PVC_NAME" --namespace "$NAMESPACE"
```

The StatefulSet finds `data-orders-db-2` and uses it rather than provisioning an empty claim. Kubernetes has preserved the claim name and ordinal relationship; the application must now perform its supported rejoin, replay, or member-replacement sequence.

Monitor replication lag, member identity, consensus state, logs, readiness, checksums, and write behavior. With the default `OrderedReady` policy, an unhealthy lower ordinal can block creation of higher ones, so have an application-specific escape plan rather than forcing readiness.

Keep the old retained PV, the current-state safety snapshot, the recovery snapshot, and the temporary validation claim until acceptance. Then clean up through an audited retention decision. If you changed StatefulSet PVC retention, decide whether and when to restore its normal policy; setting `whenScaled: Delete` again affects future scale-downs.

## Official Documentation

- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes StatefulSet stable storage](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-storage)
- [Kubernetes StatefulSet PVC retention](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#persistentvolumeclaim-retention)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Persistent Volumes: restore from a snapshot](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-snapshot-and-restore-volume-from-snapshot-support)
- [Kubernetes PersistentVolume reclaim policy](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#reclaiming)

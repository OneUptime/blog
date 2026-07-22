# Why Kubernetes Cannot Restore a Snapshot In Place-and How to Roll Back Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Volume Snapshot, Rollback, Disaster Recovery

Description: Roll back persistent data safely by restoring a CSI snapshot to a new PVC, validating it, and performing a controlled workload cutover.

---

The Kubernetes CSI snapshot API does not have an operation that rewinds an existing PersistentVolume. Its restore path creates a new PVC and asks the CSI driver to provision a new volume from the snapshot. The original claim and volume remain separate.

That constraint is useful. An in-place rewind would destroy post-snapshot data before you could validate the recovery. A new volume supports a reversible, blue-green rollback.

## Why the API creates a new volume

The CSI sequence is explicit:

1. A `VolumeSnapshot` binds to a `VolumeSnapshotContent` containing the backend snapshot handle.
2. A new PVC references the namespaced `VolumeSnapshot` in `spec.dataSource`.
3. The CSI external-provisioner passes that snapshot as `CreateVolumeRequest.volume_content_source`.
4. The driver creates a new backend volume pre-populated from the snapshot.

There is no standard CSI `RestoreSnapshotIntoExistingVolume` RPC. Kubernetes also does not let you replace the data source of an already bound PVC to repopulate its volume. A PVC is an identity and binding contract, not a command to mutate all blocks behind an existing handle.

Some storage systems offer a vendor-specific revert operation. That is outside the portable Kubernetes snapshot workflow and can have requirements such as detachment, same-volume lineage, no newer snapshots, or backend-specific consistency. It must not be assumed from CSI support.

## Define the rollback point before changing anything

Write down the desired recovery timestamp and the maximum acceptable data loss. A snapshot contains the state at its storage creation time, not at the time somebody named or scheduled it.

Inspect the snapshot:

```bash
kubectl get volumesnapshot app-data-known-good \
  --namespace app \
  -o jsonpath='ready={.status.readyToUse}{"\n"}created={.status.creationTime}{"\n"}size={.status.restoreSize}{"\n"}content={.status.boundVolumeSnapshotContentName}{"\n"}'
```

Confirm that it is `readyToUse: true` and that application consistency procedures completed. If you need changes after that point, preserve transaction logs, write-ahead logs, event streams, or an application export that can be replayed safely.

Rollback is a data-loss operation with respect to everything written after the recovery point. Obtain the required operational approval and communicate the write freeze.

## Preserve the current state first

Unless the current volume is irreparably unavailable, take a pre-rollback recovery point before cutover. It protects against choosing the wrong snapshot or discovering that the apparent corruption was elsewhere.

For a write-heavy application:

1. Drain traffic or put the application into read-only mode.
2. Flush and quiesce it using product-specific procedures.
3. Take a snapshot or independent backup of the current PVC.
4. Wait for storage readiness and record the snapshot handle.
5. Keep writers stopped if a strict recovery boundary is required.

Do not call a live storage snapshot application-consistent merely because Kubernetes reports it ready. For a dynamically created snapshot, the readiness field reflects the CSI driver's storage-level response. For a pre-provisioned snapshot, readiness can be set to true when the driver does not support `ListSnapshots`. Neither case certifies application consistency.

## Restore into a new PVC

Create a claim in the same namespace as the known-good snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data-rollback-20260722
  namespace: app
spec:
  storageClassName: production-block
  dataSource:
    name: app-data-known-good
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 100Gi
```

Use a StorageClass supported by the same compatible CSI driver and, when `status.restoreSize` is reported, request at least that size. Keep the source volume mode unless a cluster administrator has explicitly allowed volume-mode conversion on the `VolumeSnapshotContent`. Wait for the claim to bind. A `WaitForFirstConsumer` class can remain pending until a Pod references it.

Use a unique name rather than deleting the original claim and immediately reusing its name. The two-volume phase is what makes the procedure reversible.

## Validate without contaminating production

For non-mutating inspection, mount a filesystem claim read-only in an isolated Pod. Expose a raw block claim through `volumeDevices` and ensure that inspection tools do not write to it. If validation requires database crash recovery, repair, or log replay, use an isolated recovery workload with write access because those operations normally modify the restored volume. Prevent it from joining a live database cluster, consuming production queues, running scheduled jobs, or sending notifications.

Validate at several levels:

- the filesystem mounts without errors, or the raw block device appears at the expected device path and can be read;
- expected files, ownership, permissions, and encryption access are present;
- database crash recovery completes successfully;
- internal integrity checks pass;
- schema and application versions are compatible;
- record counts or checksums match the expected recovery point; and
- the application can start in a sandbox and perform representative reads.

If log replay is part of recovery, apply it to this isolated restored volume and take another snapshot after reaching the desired point. Keep the original restored-from snapshot unchanged as evidence and a retry source.

## Cut over a workload that directly names its PVC

For a Deployment, single Pod, or another controller whose pod template directly names `claimName`, update the declarative manifest to point to the restored claim:

```yaml
spec:
  template:
    spec:
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: app-data-rollback-20260722
```

Apply the complete reviewed workload manifest rather than a patch that accidentally replaces an entire `volumes` array. Then perform the cutover:

1. Confirm all old writers have terminated and the original volume is detached.
2. Deploy one restored instance with traffic disabled.
3. Verify startup recovery, migrations, readiness, logs, and storage writes.
4. Route a controlled fraction of traffic when the application permits it.
5. Monitor error rate, latency, data invariants, replication, and queue behavior.
6. Resume full traffic and remove the write freeze only after acceptance checks pass.

Do not overlap old and new writers. `ReadWriteOnce` can allow multiple Pods on one node, and even `ReadWriteOncePod` constrains only one PVC; neither access mode coordinates writes across the two different claims. A blue-green data rollback is about reversible volume identity, not simultaneous modification of two divergent copies.

## Keep a fast path back to the pre-rollback volume

Do not delete the original PVC after cutover. Label it clearly, prevent accidental mounts, and retain it for an approved window. If the restored state fails validation under real traffic:

1. stop writers again;
2. capture any required diagnostic or post-cutover data;
3. point the workload back to the original claim;
4. verify attachment and application health; and
5. analyze the failed recovery offline.

Writes made to the restored volume after cutover are not automatically merged back into the original. Decide before cutover whether those writes can be discarded, replayed from an event log, or captured through database replication.

## Handle StatefulSets differently

A StatefulSet's `volumeClaimTemplates` create stable PVC identities tied to Pod ordinals. For template `data`, StatefulSet `db`, and ordinal `2`, the expected claim is `data-db-2`. You generally cannot switch that one Pod to an arbitrary new claim by editing the Pod because the controller recreates its managed specification.

Review `.spec.persistentVolumeClaimRetentionPolicy` before scaling down: `whenScaled: Delete` removes claims for scaled-down replicas after their Pods terminate. The safe pattern is to ensure the relevant retention policy is `Retain`, scale down far enough to stop the affected ordinal or stop the set, preserve the current data with a snapshot or backup, and validate a temporary restore. During a maintenance window, set the original PV's reclaim policy to `Retain` if its backend volume must remain available as a backout, delete the ordinal PVC, and pre-create the restored PVC from the snapshot under the exact ordinal-specific name before restarting the Pod. The original PVC and its replacement cannot coexist under the same name; the PV reclaim policy preserves the old backend volume, not the deleted PVC object. Replicated databases also need member-removal, identity, and catch-up procedures from their own documentation.

## Treat vendor in-place revert as an exception

If the storage vendor documents a supported in-place revert, assess it separately. At minimum:

- take an independent backup of the current state;
- stop and detach every consumer;
- confirm the exact backend volume and snapshot handles;
- verify that the CSI driver's cached or published volume state remains valid;
- understand what happens to newer snapshots and clones;
- confirm encryption, replication, and topology behavior;
- define failure recovery if the revert stops halfway; and
- test the identical procedure on non-production volumes.

Even then, Kubernetes will not provide the same blue-green validation boundary. Prefer new-volume restore when recovery time and capacity allow it.

## Do not clean up until recovery is accepted

Three retention controls can delete different assets:

- the restored PV's reclaim policy controls the new backend volume after PVC deletion;
- the snapshot content's deletion policy controls the backend snapshot after `VolumeSnapshot` deletion; and
- StatefulSet PVC retention policy can delete ordinal claims on scale-down or set deletion.

Inspect all three before cleanup. Record the old and new PV names, CSI volume handles, source snapshot, content name, application validation evidence, and the decision that ended the rollback window.

The safest rollback is not the one that overwrites data fastest. It is the one that preserves both branches long enough to prove which state should become authoritative.

## Official Documentation

- [Kubernetes Persistent Volumes: restore from a snapshot](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-snapshot-and-restore-volume-from-snapshot-support)
- [Kubernetes CSI PVC data sources](https://kubernetes-csi.github.io/docs/volume-datasources.html)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)
- [Kubernetes StatefulSets and stable storage](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-storage)
- [Kubernetes StatefulSet PVC retention](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#persistentvolumeclaim-retention)

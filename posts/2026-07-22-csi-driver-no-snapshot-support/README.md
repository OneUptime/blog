# What to Do When Your CSI Driver Does Not Support Volume Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Backups, Persistent Storage, Disaster Recovery

Description: Choose a safe backup, migration, or driver-upgrade path when a Kubernetes CSI driver cannot create or restore volume snapshots.

---

Installing the Kubernetes snapshot CRDs and common snapshot controller does not add snapshot behavior to a CSI driver. The driver must advertise the `CREATE_DELETE_SNAPSHOT` controller capability, implement `CreateSnapshot` and `DeleteSnapshot`, run a compatible external-snapshotter sidecar, and support provisioning a new volume from the resulting snapshot.

When those capabilities are absent, no annotation, `VolumeSnapshotClass`, or backup product can manufacture them. The right response is to confirm the gap, choose another recovery mechanism, and test its restore path.

## Confirm that support is truly absent

First identify the CSI driver behind the affected PVC:

```bash
NAMESPACE=app
PVC_NAME=app-data

PV_NAME=$(kubectl get pvc "$PVC_NAME" \
  --namespace "$NAMESPACE" \
  -o jsonpath='{.spec.volumeName}')

kubectl get pv "$PV_NAME" \
  -o jsonpath='{.spec.csi.driver}{"\n"}'
```

Then distinguish an unsupported driver from an incomplete installation:

- Check the vendor's documentation for the exact driver and version.
- Confirm that the relevant volume type supports snapshots; a driver may support snapshots for some backend volume types or StorageClasses but not others.
- Inspect the driver's controller workload for an external-snapshotter sidecar.
- Check for a `VolumeSnapshotClass` whose `driver` exactly matches the PV.
- Verify that the snapshot CRDs and common controller are healthy.
- Read the `VolumeSnapshot` events and the driver controller logs after a disposable smoke test.

A missing `csi-snapshotter` sidecar can be a packaging or configuration problem. A driver that does not implement `CreateSnapshot` is a capability gap. Fix the former through the vendor's supported deployment; choose an alternative for the latter.

The `CSIDriver` Kubernetes object does not list snapshot controller capabilities, so `kubectl get csidriver` cannot settle the question by itself.

## Prefer application-native backups for stateful services

For databases and other structured state, a native backup is often the strongest first alternative. Examples include a PostgreSQL base backup plus WAL archive, MySQL physical or logical backup with binary logs, and database-operator backup resources.

Application-aware tooling can provide:

- transactionally consistent recovery points;
- point-in-time recovery rather than one storage instant;
- integrity checks and catalog metadata;
- portable output that does not require the original CSI backend; and
- documented restore procedures for a new cluster.

Store the backup outside the source volume and, for disaster recovery, outside the source cluster and storage failure domain. A backup file written only onto the PVC it protects is lost with that PVC.

Native backups have costs: they consume CPU and I/O, need credentials and retention controls, and require monitoring. Those are manageable operational requirements, not reasons to rely on an unsupported snapshot API.

## Use file-level backup when the filesystem is the unit of recovery

A backup agent or Kubernetes backup tool can read mounted files and send them to independent object storage. This works without CSI snapshot APIs because it copies data through the filesystem.

Plan for consistency explicitly:

1. Quiesce writes or invoke an application pre-backup hook.
2. Record the backup start, end, and application version.
3. Copy metadata such as permissions, ownership, links, and extended attributes when they matter.
4. Resume writes only after the required consistency boundary is complete.
5. Restore into a new PVC and validate the application, not only checksums.

Live recursive copies are not automatically point-in-time consistent. Files can change between directory traversal and read, and a database's on-disk files may be unusable without its supported backup protocol. Use this method for appropriate workloads or combine it with application quiescing.

## Upgrade or enable the existing driver

If a newer supported driver release adds snapshots, upgrading may be the least disruptive long-term solution. Treat it as a storage change:

- read the vendor's Kubernetes, CSI sidecar, and backend compatibility matrix;
- check whether snapshot support needs a chart value or controller component;
- inventory PVs, volume handles, reclaim policies, topology, and encryption settings;
- test upgrade, snapshot, deletion, and restore in a non-production cluster; and
- keep a non-snapshot backup before changing the production driver.

Do not add a random `csi-snapshotter` image to an old controller pod. The sidecar needs compatible RBAC, access to the correct Unix socket, and a driver that implements the underlying calls. A sidecar can relay RPCs; it cannot supply backend logic.

## Migrate data to a snapshot-capable StorageClass

Kubernetes cannot change an existing PVC's StorageClass in place. Migrate by provisioning a new PVC from a snapshot-capable driver and copying or replicating data.

A practical file-copy migration looks like this:

1. Create a destination PVC with the target StorageClass, capacity, access mode, and volume mode.
2. Run an initial copy while the application remains online if its consistency model permits it.
3. Stop or quiesce writers during a maintenance window.
4. Run an incremental final copy and verify counts, checksums, permissions, and application-specific integrity.
5. Point the workload at the new claim or recreate the controller using the new claim identity.
6. Validate reads and writes, then take and restore-test a CSI snapshot.
7. Retain the old volume until the rollback window closes.

For large databases, application replication is usually safer than `rsync`: add a replica on the new storage, allow it to catch up, perform a controlled role change, and preserve the former primary for rollback according to product documentation.

Topology deserves attention. A destination StorageClass with `WaitForFirstConsumer` may not bind until a migration Pod references it. Ensure the migration Pod can mount both claims and that access modes permit the planned attachment.

## Treat backend-native snapshots as a separate API

The storage system might support snapshots even when its CSI driver does not expose them. A vendor CLI or cloud API can sometimes protect the volume handle directly, but Kubernetes will not track that operation.

Before adopting this route, answer all of these questions in vendor documentation:

- How is a Kubernetes PV mapped unambiguously to the backend volume?
- Must the volume be detached or quiesced?
- Is the snapshot crash-consistent or application-consistent?
- How is a new backend volume created from it?
- Can the CSI driver import or statically provision that volume safely?
- How are topology, encryption keys, credentials, and ownership preserved?
- Who deletes expired snapshots, and how is that reconciled with Kubernetes?

Do not create a `VolumeSnapshotContent` with an arbitrary backend ID unless the CSI driver supports restoring that snapshot handle. Static Kubernetes import still relies on the driver to understand the handle and provision a volume from it.

Backend snapshots can be a valid emergency or vendor-supported workflow, but document them as external assets. Monitor drift between Kubernetes PVs and backend snapshot inventory.

## Know what does not replace a snapshot

Several nearby features solve different problems:

- A PVC clone needs CSI clone support and creates an independent live volume, but without separate retention and failure-domain controls it is not a backup strategy.
- A second Pod mounting the same PVC does not create a recovery point.
- A StatefulSet's stable PVC identity preserves storage across Pod recreation; it does not protect against data corruption.
- `Retain` on a PV reclaim policy prevents automatic volume deletion after claim release, but it does not create historical versions.
- A backup operator using CSI snapshots still depends on the driver's snapshot and restore implementation.

Choose based on the failure you need to recover from, not on whether a feature produces another Kubernetes object.

## Build a recovery plan around RPO and RTO

Map each viable method to measurable requirements:

| Method | Typical strength | Important limitation |
| --- | --- | --- |
| Application-native backup | Consistency and point-in-time recovery | Application-specific operations |
| File-level copy to object storage | Driver-independent portability | Quiescing and metadata fidelity |
| Migrate to another CSI driver | Restores standard snapshot workflow | Storage migration risk and downtime |
| Backend-native snapshot | Potentially fast local recovery | Outside Kubernetes lifecycle and often same failure domain |
| Storage or application replication | Low recovery-point lag | Replication can copy corruption and is not retention |

For critical data, combine mechanisms. For example, use native database backups in another account for durable recovery, replication for availability, and CSI snapshots after migrating to a capable driver for fast local recovery.

Record the recovery point objective, expected restore time, retention, encryption, off-cluster location, and named owner. Schedule restore drills. A method is not a backup strategy until a clean cluster can use it to recover the required application state.

## Avoid destructive cleanup during investigation

If a failed `VolumeSnapshot` or partially created backend asset exists, inspect its `VolumeSnapshotContent` and `deletionPolicy` before deleting anything. With `Delete`, removing the Kubernetes snapshot can ask the driver to remove the physical snapshot. With `Retain`, manual cleanup is required.

Do not remove finalizers or patch controller-owned status merely to make objects disappear. Those protections exist to keep the API and storage backend from diverging. Escalate to the driver vendor with events, sidecar and driver logs, object YAML, component versions, and sanitized volume or snapshot handles.

## Official Documentation

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI external-snapshotter](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Kubernetes CSI driver deployment model](https://kubernetes-csi.github.io/docs/deploying.html)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)

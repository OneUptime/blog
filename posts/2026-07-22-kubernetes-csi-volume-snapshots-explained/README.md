# Kubernetes CSI Volume Snapshots Explained: VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Volume Snapshots, Persistent Storage, Disaster Recovery

Description: Understand how Kubernetes coordinates CSI snapshots through VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass resources.

---

A Kubernetes volume snapshot is a point-in-time copy exposed by a storage system through a Container Storage Interface (CSI) driver. The Kubernetes API does not copy filesystem blocks itself. It records the request, binds Kubernetes objects together, and lets the CSI driver ask the storage backend to create or delete the physical snapshot.

The stable API is `snapshot.storage.k8s.io/v1`. Unlike `PersistentVolume` and `PersistentVolumeClaim`, its three resource types are CustomResourceDefinitions (CRDs), so a cluster needs the snapshot CRDs and the common snapshot controller in addition to a snapshot-capable CSI driver.

## The three API objects

The object model deliberately resembles dynamic volume provisioning:

| Snapshot resource | Rough storage equivalent | Scope | Owner |
| --- | --- | --- | --- |
| `VolumeSnapshot` | `PersistentVolumeClaim` | Namespaced | Application or backup operator |
| `VolumeSnapshotContent` | `PersistentVolume` | Cluster | Snapshot controller or cluster administrator |
| `VolumeSnapshotClass` | `StorageClass` | Cluster | Cluster administrator |

The analogy is useful, but snapshots and volumes are different resources. A `VolumeSnapshot` cannot be mounted by a Pod. To read its data, provision a new PVC with the snapshot as its `dataSource`.

### VolumeSnapshot: the namespaced request

A `VolumeSnapshot` either asks for a new snapshot of a PVC or binds to a pre-existing `VolumeSnapshotContent`. Exactly one member of `spec.source` is set, and that source is immutable.

This dynamically provisioned request snapshots the bound PVC `postgres-data`:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-before-upgrade
  namespace: database
spec:
  volumeSnapshotClassName: production-snapshots
  source:
    persistentVolumeClaimName: postgres-data
```

The source PVC is implicitly in the same namespace as the `VolumeSnapshot`. It must already be bound. Wait for a newly created PVC to reach `Bound` before creating its snapshot.

The useful fields are written under `status`, not `spec`:

- `boundVolumeSnapshotContentName` identifies the cluster-scoped content object.
- `creationTime` is the point-in-time reported by the storage system.
- `readyToUse` indicates whether the driver says the snapshot can be used for a restore.
- `restoreSize` is the minimum requested capacity for a restored PVC when the size is known.
- `error` contains the most recently observed failure; controllers retry and clear it after success.

Treat a missing `readyToUse` as unknown, not as success. Wait specifically for `true` before beginning a restore:

```bash
kubectl wait \
  --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/postgres-before-upgrade \
  --namespace database \
  --timeout=10m
```

`kubectl wait` only confirms the Kubernetes status. Your restore test must still verify application data.

### VolumeSnapshotContent: the cluster record

`VolumeSnapshotContent` represents the physical snapshot in the backend. In the dynamic flow, the snapshot controller creates it. Its specification records:

- the CSI `driver` name;
- the source volume's CSI `volumeHandle`;
- the bound `volumeSnapshotRef` including namespace, name, and UID;
- the `VolumeSnapshotClass` name;
- the copied `deletionPolicy`; and
- the source volume mode, when known.

After the CSI call succeeds, its status normally contains a backend `snapshotHandle`, `creationTime`, `restoreSize`, and `readyToUse`. A typical relationship looks like this:

```text
database/postgres-before-upgrade (VolumeSnapshot)
        <--- bidirectional binding --->
snapcontent-<uid> (VolumeSnapshotContent)
        ---> snapshotHandle ---> storage backend snapshot
```

Binding is one-to-one. Consumers should verify both references rather than trusting only one side. The namespaced object points to the content through `status.boundVolumeSnapshotContentName`; the content points back through `spec.volumeSnapshotRef`.

Do not manually edit a dynamically created content object's source or binding. Those fields are immutable and controller-managed. Administrators create `VolumeSnapshotContent` directly only for the static import workflow, where a snapshot already exists in the storage system.

### VolumeSnapshotClass: driver policy

A `VolumeSnapshotClass` tells the snapshotter which CSI driver and backend-specific settings to use for dynamic creation:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-hostpath-snapshots
driver: hostpath.csi.k8s.io
deletionPolicy: Retain
parameters: {}
```

The example driver is the upstream test driver. In a real cluster, use the exact class supplied or documented by the storage vendor. The class's `driver` must match the CSI driver behind the source PVC. Parameters are opaque to Kubernetes and are driver-specific.

`deletionPolicy` controls what happens when the bound `VolumeSnapshot` is deleted:

- `Delete` removes the `VolumeSnapshotContent` and asks the CSI driver to delete the backend snapshot.
- `Retain` preserves the content and backend snapshot for administrator-managed cleanup.

This is not the same as a StorageClass's PV reclaim policy. Review both independently. Snapshot classes are immutable; create a new named class when policy or parameters change.

A cluster can mark one default `VolumeSnapshotClass` per CSI driver with the annotation `snapshot.storage.kubernetes.io/is-default-class: "true"`. If a request omits `volumeSnapshotClassName`, Kubernetes selects the default whose driver matches the source PVC. More than one default for the same driver makes creation fail, so backup automation is often clearer when it names a class explicitly.

## How the controllers divide the work

Four moving parts participate:

1. The user or backup controller creates a `VolumeSnapshot`.
2. The cluster-wide snapshot controller validates the relationship and creates a `VolumeSnapshotContent` for a dynamic request.
3. The `csi-snapshotter` sidecar running with the CSI driver's controller watches matching content objects and calls the driver's `CreateSnapshot` RPC.
4. The CSI driver creates or finds the backend snapshot and returns its ID, size, creation time, and readiness state. The sidecar and common controller propagate that status back to the namespaced object.

There is one common snapshot controller deployment for the cluster, but each snapshot-capable CSI driver needs its own external-snapshotter sidecar. Installing the CRDs and common controller therefore does not add snapshot support to a driver that lacks it.

The reverse flow happens on deletion. The common controller enforces the Kubernetes lifecycle, while the sidecar calls `DeleteSnapshot` when the content's policy requires backend deletion.

## Inspect a snapshot end to end

Start with the request:

```bash
kubectl get volumesnapshot postgres-before-upgrade \
  --namespace database \
  -o wide

kubectl describe volumesnapshot postgres-before-upgrade \
  --namespace database
```

Then resolve and inspect its content:

```bash
CONTENT_NAME=$(kubectl get volumesnapshot postgres-before-upgrade \
  --namespace database \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

kubectl get volumesnapshotcontent "$CONTENT_NAME" -o yaml
```

Compare the content driver with the source PV driver:

```bash
PV_NAME=$(kubectl get pvc postgres-data \
  --namespace database \
  -o jsonpath='{.spec.volumeName}')

kubectl get pv "$PV_NAME" -o jsonpath='{.spec.csi.driver}{"\n"}'
kubectl get volumesnapshotcontent "$CONTENT_NAME" \
  -o jsonpath='{.spec.driver}{"\n"}'
```

The values should match. Also inspect events and both controller logs when status stops progressing; each layer owns a different part of the workflow.

## What consistency does a snapshot provide?

Kubernetes standardizes orchestration, not application consistency. Unless the driver and application coordinate additional behavior, expect a storage-level, crash-consistent point in time. Data buffered in an application, database page cache, or filesystem may not be in a transactionally safe state.

For databases, use documented pre-snapshot hooks, native backup APIs, replication-aware operators, or volume group snapshot capabilities where appropriate. Even a consistent snapshot remains tied to the storage backend's durability and failure domain unless it is copied elsewhere. Test restores and keep an independent backup when the recovery requirement includes cluster, account, region, or storage-system loss.

## Restore creates a new volume

The standard restore operation provisions a new PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
  namespace: database
spec:
  storageClassName: production-block
  dataSource:
    name: postgres-before-upgrade
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

The snapshot must be in the PVC's namespace for the ordinary `dataSource` flow, the selected StorageClass must use the compatible CSI driver, and requested storage cannot be smaller than `status.restoreSize` when that field is present. Kubernetes does not overwrite the source PVC in place.

That final point is central to safe operations: create, bind, mount, and validate the restored PVC before changing a workload to use it. Keep the original volume and snapshot until the recovery has passed application-level checks.

## Official Documentation

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes Persistent Volumes: restore from a snapshot](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-snapshot-and-restore-volume-from-snapshot-support)
- [Kubernetes CSI VolumeSnapshot API reference](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [External Snapshotter repository and controller design](https://github.com/kubernetes-csi/external-snapshotter)
- [CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)

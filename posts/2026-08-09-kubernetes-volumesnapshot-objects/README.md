# Kubernetes `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass`: What Does Each Object Do?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, VolumeSnapshotContent, VolumeSnapshotClass, Persistent Storage

Description: Understand the three Kubernetes CSI snapshot objects, who creates each one, how they bind, and which object controls deletion and restore behavior.

---

Kubernetes represents one storage snapshot with three different API objects because users, cluster administrators, and storage drivers need different controls. A `VolumeSnapshot` is the namespaced request, a `VolumeSnapshotContent` is the cluster-scoped record of the storage-system snapshot, and a `VolumeSnapshotClass` supplies driver-specific policy for dynamic creation.

The relationship resembles PVC, PV, and StorageClass, but it is not identical. All three snapshot kinds are CustomResourceDefinitions (CRDs), not built-in core API types. They work only with CSI drivers that implement snapshot operations, and they require both the common snapshot controller and a driver-side external-snapshotter.

## The Three Objects at a Glance

| Object | Scope | Usually created by | Main job |
| --- | --- | --- | --- |
| `VolumeSnapshot` | Namespaced | Application owner or backup controller | Requests a snapshot or claims a pre-provisioned one |
| `VolumeSnapshotContent` | Cluster-scoped | Snapshot controller for dynamic snapshots; administrator for static imports | Binds the request to a CSI snapshot handle and records lifecycle state |
| `VolumeSnapshotClass` | Cluster-scoped | Cluster or storage administrator | Selects a CSI driver, deletion policy, and driver parameters |

A healthy dynamic path looks like this:

```text
VolumeSnapshot
  -> selected VolumeSnapshotClass
  -> snapshot controller creates VolumeSnapshotContent
  -> external-snapshotter calls the CSI driver
  -> driver creates a storage-system snapshot
  -> status flows back to VolumeSnapshotContent and VolumeSnapshot
```

None of these objects contains the volume data. They are API records that coordinate a snapshot held by the storage backend.

## VolumeSnapshot: the Namespaced Request

A workload owner normally creates a `VolumeSnapshot` in the same namespace as its source PVC:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: orders-db-before-upgrade
  namespace: orders
spec:
  volumeSnapshotClassName: fast-csi-snapshots
  source:
    persistentVolumeClaimName: orders-data
```

For dynamic provisioning, `spec.source.persistentVolumeClaimName` identifies the source claim. The source PVC and `VolumeSnapshot` must be in the same namespace. The snapshot class must use the same CSI driver that provisioned the source volume.

The alternative source is `volumeSnapshotContentName`, used when an administrator has already created a `VolumeSnapshotContent` for an existing backend snapshot. The two source fields are mutually exclusive.

Useful status fields include:

- `boundVolumeSnapshotContentName`, the content object bound to the request;
- `creationTime`, as reported through the CSI path;
- `readyToUse`, which must be true before the snapshot should be used as a restore source;
- `restoreSize`, the minimum capacity known to be required for a restored volume; and
- `error`, which can expose a controller or driver failure.

Do not patch `readyToUse` to true. It is observed state, not an operator override.

## VolumeSnapshotContent: the Cluster-Scoped Binding

`VolumeSnapshotContent` is analogous to a PV in one important respect: it is cluster-scoped and binds to one namespaced request. In dynamic provisioning, the common snapshot controller creates it. Its spec identifies the CSI driver, deletion policy, source volume handle, snapshot class, volume mode, and the exact `VolumeSnapshot` reference.

An abbreviated dynamically created object looks like this:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotContent
metadata:
  name: snapcontent-2f83b4b0
spec:
  deletionPolicy: Delete
  driver: csi.example.com
  source:
    volumeHandle: backend-volume-8192
  sourceVolumeMode: Filesystem
  volumeSnapshotClassName: fast-csi-snapshots
  volumeSnapshotRef:
    name: orders-db-before-upgrade
    namespace: orders
    uid: 2f83b4b0-0000-0000-0000-000000000000
```

After the CSI driver creates the snapshot, the content status contains the opaque `snapshotHandle` returned by that driver. Treat that handle as provider-specific. It is not inherently usable by another driver, region, account, or cluster.

For a pre-provisioned snapshot, an administrator creates the content and sets `spec.source.snapshotHandle` instead of `volumeHandle`. The `volumeSnapshotRef` must point to the intended claim. A user then creates a `VolumeSnapshot` whose source is that content object's name. Binding is one-to-one; do not try to attach one content object to several namespaced snapshots.

Because the object can control a real backend asset, restrict create, update, patch, and delete permission on `VolumeSnapshotContent` to trusted administrators and controllers.

## VolumeSnapshotClass: Driver and Lifecycle Policy

A `VolumeSnapshotClass` tells Kubernetes which CSI driver should handle a dynamically created snapshot and which provider-specific parameters to send:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: fast-csi-snapshots
driver: csi.example.com
deletionPolicy: Retain
parameters:
  snapshotTier: durable
```

The driver name must exactly match the source PV's CSI driver. The parameters are not portable Kubernetes settings; use only keys documented by that driver. Class objects are effectively configuration contracts, and their key fields are immutable. Create a new class rather than trying to repurpose an existing one.

The required `deletionPolicy` has two values:

- `Delete` tells the controllers to remove the bound content and ask the CSI driver to delete the backend snapshot when the namespaced snapshot is deleted.
- `Retain` leaves both the content object and backend snapshot behind when the namespaced snapshot is deleted.

`Retain` is not automatic off-cluster backup. Someone must inventory, protect, restore-test, and eventually reclaim the retained provider snapshot.

A class can be marked as the default for its driver:

```yaml
metadata:
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
```

Kubernetes selects a default whose driver matches the source PVC's storage driver. There must be no more than one default `VolumeSnapshotClass` for the same CSI driver. Naming a class explicitly is clearer for production backup policy.

## Dynamic and Pre-Provisioned Lifecycles

Most application snapshots are dynamic:

1. A user creates a `VolumeSnapshot` from a PVC.
2. The snapshot controller selects the class and creates content.
3. The driver's external-snapshotter sees that content and calls `CreateSnapshot` on the CSI driver.
4. The driver returns a snapshot handle, creation time, size, and readiness.
5. Controllers publish that state back to the two API objects.

Static, or pre-provisioned, binding starts with a snapshot that already exists in the storage system:

1. An administrator confirms its driver, handle, source volume mode, credentials, and accessibility.
2. The administrator creates `VolumeSnapshotContent` with `source.snapshotHandle` and the future claim reference.
3. The user creates the matching `VolumeSnapshot` with `source.volumeSnapshotContentName`.
4. The controller verifies and binds the pair.

Static import does not copy snapshot data. It only makes an accessible driver snapshot known to the Kubernetes API.

## Restore Uses the VolumeSnapshot

Applications normally restore from the namespaced `VolumeSnapshot`, not directly from its content object. A new PVC references the ready snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: orders-data-restore-test
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

The external provisioner asks the CSI driver to create a new volume from the bound snapshot handle. This does not overwrite the original PVC. The target StorageClass must use a driver that can access and restore the snapshot, the requested size cannot be below `restoreSize`, and the volume mode must be compatible unless an administrator has explicitly allowed a mode change on the content.

## Inspect the Relationship Safely

Start from the namespaced request and follow the recorded binding:

```bash
kubectl -n orders get volumesnapshot orders-db-before-upgrade -o yaml
kubectl get volumesnapshotcontent \
  "$(kubectl -n orders get volumesnapshot orders-db-before-upgrade \
      -o jsonpath='{.status.boundVolumeSnapshotContentName}')" -o yaml
kubectl get volumesnapshotclass fast-csi-snapshots -o yaml
kubectl get pv "$(kubectl -n orders get pvc orders-data \
  -o jsonpath='{.spec.volumeName}')" -o jsonpath='{.spec.csi.driver}{"\n"}'
```

Compare the PV's CSI driver, the snapshot class driver, and the content driver. Then inspect events and the common snapshot controller, external-snapshotter, CSI driver, and storage backend in that order. Avoid editing finalizers, bindings, handles, or status fields to make an unhealthy chain appear complete.

## Official Documentation

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes CSI: Snapshot and Restore Feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI: Snapshot Controller](https://kubernetes-csi.github.io/docs/snapshot-controller.html)
- [Kubernetes CSI: External Snapshotter](https://kubernetes-csi.github.io/docs/external-snapshotter.html)

## Conclusion

Use `VolumeSnapshot` as the namespaced request and restore source, `VolumeSnapshotContent` as the protected cluster-wide binding to the provider snapshot, and `VolumeSnapshotClass` as the driver and deletion-policy contract. Following those ownership boundaries makes troubleshooting safer: trace the request to its content, class, CSI driver, and backend instead of patching controller-owned state.

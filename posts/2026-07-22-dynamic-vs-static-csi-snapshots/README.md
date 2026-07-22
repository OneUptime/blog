# Dynamic vs. Static CSI Snapshots: When to Create or Import VolumeSnapshotContent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Volume Snapshots, VolumeSnapshotContent, Persistent Storage

Description: Choose between dynamic CSI snapshot creation and static import of a pre-existing backend snapshot into Kubernetes.

---

Dynamic and static CSI snapshots reach the same bound pair of Kubernetes objects, but they begin from opposite directions. Dynamic provisioning starts with a Kubernetes PVC and asks the CSI driver to create a backend snapshot. Static provisioning starts with an existing backend snapshot and asks a cluster administrator to represent it as a `VolumeSnapshotContent`.

Use dynamic creation for ordinary backups and pre-change recovery points. Use static import only when a real, compatible snapshot already exists outside the Kubernetes snapshot API.

## Compare the two workflows

| Question | Dynamic snapshot | Static snapshot import |
| --- | --- | --- |
| What already exists? | A bound source PVC | A backend snapshot ID |
| First API object | `VolumeSnapshot` | `VolumeSnapshotContent` |
| `VolumeSnapshot.spec.source` | `persistentVolumeClaimName` | `volumeSnapshotContentName` |
| `VolumeSnapshotContent.spec.source` | Controller fills `volumeHandle` | Administrator fills `snapshotHandle` |
| Who creates content? | Common snapshot controller | Cluster administrator |
| Is a class needed? | Yes, explicit or matching default | Optional if omitted from both objects |
| Main use | Normal in-cluster snapshot creation | Import, recovery, migration, or retained snapshot reattachment |

Both require a CSI driver that understands the backend snapshot and can provision a new volume from it.

## Dynamic provisioning: request a new snapshot

The application or backup controller creates a namespaced `VolumeSnapshot`:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: orders-before-upgrade
  namespace: payments
spec:
  volumeSnapshotClassName: production-snapshots
  source:
    persistentVolumeClaimName: orders-data
```

The source PVC is in the same namespace and must be bound. The class's `driver` must match the CSI driver recorded on that PVC's PV.

The common snapshot controller creates a cluster-scoped `VolumeSnapshotContent`. Its source contains the PV's CSI `volumeHandle`, not the claim name. The driver-specific external-snapshotter sees the content and invokes `CreateSnapshot`. After the backend responds, status propagates through the content to the request.

Wait for readiness:

```bash
kubectl wait \
  --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/orders-before-upgrade \
  --namespace payments \
  --timeout=15m
```

Inspect the controller-created content, but do not hand-edit it:

```bash
CONTENT_NAME=$(kubectl get volumesnapshot orders-before-upgrade \
  --namespace payments \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

kubectl get volumesnapshotcontent "$CONTENT_NAME" -o yaml
```

The class's `deletionPolicy` is copied to this object. If it is `Delete`, deleting the namespaced snapshot ultimately asks the driver to delete the backend snapshot. If it is `Retain`, the content and backend asset remain for administrator management.

## Static provisioning: import a real snapshot handle

Static import is appropriate when, for example:

- a backend snapshot was created through a vendor API during an incident;
- a `Retain` policy preserved content and the snapshot must be rebound deliberately;
- a supported migration made an existing snapshot visible to a new cluster; or
- an administrator is reconstructing Kubernetes metadata from a backend inventory.

Before import, verify in the CSI driver's documentation that the target driver accepts that snapshot ID. A cloud console name, display label, ARN, UUID, or array path is not automatically the CSI `snapshotHandle`. Use the exact identifier and format the driver expects.

Also confirm that the snapshot is accessible from the cluster's storage account, region, project, topology, and encryption context.

### Create the VolumeSnapshotContent

The administrator creates a cluster-scoped content object first:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotContent
metadata:
  name: imported-orders-content
spec:
  deletionPolicy: Retain
  driver: csi.example.com
  source:
    snapshotHandle: backend-snapshot-7f31b2
  sourceVolumeMode: Filesystem
  volumeSnapshotRef:
    name: imported-orders
    namespace: payments
```

Replace `csi.example.com`, the handle, mode, names, and namespace with verified values. The driver name must exactly equal the name returned by the CSI driver. `volumeSnapshotRef` can point to a `VolumeSnapshot` that does not exist yet, but its name and namespace must match the object created next.

`deletionPolicy: Retain` is the conservative import default. Choosing `Delete` authorizes later Kubernetes deletion to invoke the CSI driver's `DeleteSnapshot` against the imported asset. Do that only when ownership and retention policy are unambiguous.

Set `sourceVolumeMode` to `Filesystem` or `Block` when it is known. For a pre-provisioned snapshot, the administrator is responsible for its accuracy. Modern snapshot components use it to prevent an unauthorized mode conversion during restore.

### Bind a namespaced VolumeSnapshot

Create the matching request object:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: imported-orders
  namespace: payments
spec:
  source:
    volumeSnapshotContentName: imported-orders-content
```

The common controller validates the bidirectional relationship and binds the pair. If you set `volumeSnapshotClassName`, the content must use the same class name; omitting it from both is simpler for a one-off import.

Verify both sides:

```bash
kubectl get volumesnapshot imported-orders \
  --namespace payments \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}{"\t"}{.status.readyToUse}{"\t"}{.status.restoreSize}{"\n"}'

kubectl get volumesnapshotcontent imported-orders-content \
  -o jsonpath='{.spec.volumeSnapshotRef.namespace}{"/"}{.spec.volumeSnapshotRef.name}{"\t"}{.status.snapshotHandle}{"\t"}{.status.readyToUse}{"\n"}'
```

For a pre-existing snapshot, the external-snapshotter can use `ListSnapshots` to discover size, creation time, and readiness when the driver implements it. The CSI API makes `ListSnapshots` optional; when it is unsupported, the snapshot API may report the imported object ready without filling every status detail. A restore test remains essential.

## Do not use static content as a shortcut

Creating a content object does not create blocks in the backend. The `snapshotHandle` must identify a snapshot that already exists. Inventing a handle or copying one from an incompatible driver produces a bound-looking object that cannot restore.

Static import also does not copy a snapshot between clusters or regions. Kubernetes custom resources contain metadata, not snapshot data. Moving recovery points requires a vendor-supported backend copy, export, or replication process before import.

Do not use `spec.source.volumeHandle` for a pre-existing snapshot. That field identifies a source volume in the dynamic flow. Static content uses `spec.source.snapshotHandle`. Exactly one source member is allowed, and it is immutable.

Likewise, do not reuse one content object for multiple namespaced snapshots. Binding is one-to-one and includes the `VolumeSnapshot` identity. Create or preserve the correct pair according to the documented recovery procedure.

## Restore both kinds the same way

After either workflow reaches `readyToUse: true`, restore by creating a new PVC in the `VolumeSnapshot` namespace:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: orders-data-restored
  namespace: payments
spec:
  storageClassName: production-block
  dataSource:
    name: imported-orders
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 100Gi
```

The requested capacity cannot be smaller than the reported restore size. The target StorageClass must provision through a driver compatible with the snapshot. Mount the restored PVC in a controlled Pod and perform application-level integrity checks before using it in production.

## Preserve audit information

For dynamic snapshots, retain the source PVC/PV identity, class version, content name, backend handle, creation time, readiness, and application consistency procedure.

For imports, additionally record who created the backend snapshot, through which API, its original volume and mode, account and region, encryption key, retention owner, and evidence that the handle belongs to the named driver. This turns a fragile manual binding into a reproducible recovery artifact.

## Official Documentation

- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI VolumeSnapshot API reference](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes CSI Snapshot and Restore feature](https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html)
- [Kubernetes CSI external-snapshotter](https://kubernetes-csi.github.io/docs/external-snapshotter.html)
- [Container Storage Interface specification](https://github.com/container-storage-interface/spec/blob/master/spec.md)

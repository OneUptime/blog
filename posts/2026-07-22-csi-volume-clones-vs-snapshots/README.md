# CSI Volume Clones vs. Volume Snapshots: Which Should You Use?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Volume Clone, VolumeSnapshot, PersistentVolumeClaim, Storage

Description: Choose CSI cloning or snapshot-and-restore based on source lifetime, recovery needs, portability, consistency, and driver support.

---

Use a CSI volume clone when you need a new working copy of an existing PVC now and do not need a separately managed recovery point. Use a `VolumeSnapshot` when you need a named point in time that can outlive the source PVC, be retained, cataloged, and used for multiple restores.

Both ultimately ask a CSI driver to create a new volume from existing data. Neither guarantees application consistency, cross-driver portability, or a particular copy-on-write implementation.

## The API Difference

A clone names a source `PersistentVolumeClaim` directly in the destination PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: catalog-data-clone
  namespace: catalog
spec:
  storageClassName: premium-csi
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 200Gi
  dataSource:
    kind: PersistentVolumeClaim
    name: catalog-data
```

A snapshot workflow first creates a recovery-point object:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: catalog-before-upgrade
  namespace: catalog
spec:
  volumeSnapshotClassName: premium-csi-snapshots
  source:
    persistentVolumeClaimName: catalog-data
```

After `readyToUse` becomes true, a destination PVC references it:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: catalog-data-restore
  namespace: catalog
spec:
  storageClassName: premium-csi
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 200Gi
  dataSource:
    name: catalog-before-upgrade
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

In both cases, `dataSource` is a provisioning-time input. The CSI provisioner resolves the source, asks the driver to create a pre-populated volume, and creates a new PV that represents it. The source volume is not mounted into the destination pod, and later writes to either volume do not appear in the other.

## Clone Requirements and Semantics

Kubernetes documents these constraints for CSI volume cloning:

- the driver and dynamic provisioner must support cloning;
- the source PVC must be bound and available rather than in use;
- source and destination PVCs must be in the same namespace;
- destination capacity must be at least the source volume's capacity;
- source and destination must use the same `volumeMode`;
- the destination can name the same or a different StorageClass.

Although a different class is allowed by the Kubernetes API, the destination provisioner still needs a CSI driver capable of consuming the source volume. A clone is not a general transfer between unrelated drivers or storage providers.

Once provisioned, the clone is independent. Deleting or changing the source does not change the clone, and deleting the clone does not change the source.

The source PVC itself is the data-source identity. If it is deleted before provisioning completes, there is no separately retained snapshot handle to return to. That tight lifecycle is useful for immediate duplication but poor as a backup catalog.

## Snapshot Requirements and Semantics

CSI snapshots require more control-plane components: the snapshot CRDs, common snapshot controller, the driver's external-snapshotter sidecar, driver snapshot capability, and an appropriate `VolumeSnapshotClass`.

The class sets a `deletionPolicy`:

- `Delete` removes the content object and provider snapshot when the namespaced snapshot is deleted;
- `Retain` leaves them for manual administration and possible re-import.

A snapshot's status exposes `restoreSize`, readiness, creation time, and a binding to cluster-scoped content when those values are available. It can be used to provision multiple independent PVCs, subject to provider and quota limits. The source PVC can disappear while a properly retained snapshot remains.

When `status.restoreSize` is specified, snapshot restore capacity must be at least that value. It is the minimum restore size reported by the driver, not a count of used filesystem bytes.

## Compare the Operational Intent

| Question | Clone | Snapshot and restore |
| --- | --- | --- |
| Primary object retained | destination PVC | `VolumeSnapshot` and content |
| Source needed during provisioning | source PVC | ready snapshot |
| Can recovery point outlive source PVC? | no separate recovery point | yes, subject to deletion policy/backend |
| Multiple later copies | clone source repeatedly | restore the same snapshot repeatedly |
| Snapshot controller required | no | yes |
| Retention policy | ordinary PVC/PV lifecycle | snapshot content policy plus backup lifecycle |
| Best fit | immediate dev/test or workflow copy | rollback, backup tier, migration handoff |

Storage cost and speed cannot be decided from Kubernetes objects. A driver may implement a clone as a full copy, a backend-native clone, or copy-on-write. A snapshot may also consume little initially and grow as blocks diverge. Provider documentation defines performance isolation, chain depth, billing, encryption, and deletion dependencies.

## Consistency Is the Same Problem for Both

Cloning a live PVC does not establish an application transaction boundary. The source may contain dirty filesystem pages, database buffers, or several related PVCs at different logical times. The same is true for an ordinary single-volume snapshot.

For a database:

- use a clean shutdown or vendor-supported quiesce procedure;
- include data, journal, WAL, and tablespace volumes;
- use a CSI volume group snapshot when simultaneous multi-volume capture is required and supported;
- restore into isolation and allow documented recovery to finish;
- validate records and application invariants.

If Kubernetes documentation or the driver requires the clone source to be unused, stop the consuming pod rather than assuming online cloning is safe just because the backend can copy blocks.

## When a Clone Is the Better Choice

Choose a clone for:

- a short-lived development environment based on a controlled source PVC;
- a writable test copy before a schema experiment;
- duplicating a golden data volume inside one namespace;
- a pipeline step that immediately consumes an independent volume;
- avoiding snapshot-object lifecycle when no retained recovery point is needed.

A clone reduces API and controller steps: one destination PVC expresses the entire request. Label it with its source, purpose, owner, and expiry because Kubernetes does not automatically garbage-collect arbitrary cloned PVCs.

Do not call a long-lived clone a backup merely because it has independent data. It can still share the same account, region, encryption key, administrative credentials, and deletion authority as the source.

## When a Snapshot Is the Better Choice

Choose a snapshot for:

- a pre-upgrade rollback point;
- scheduled recovery points with retention;
- restoring several test environments from one frozen point;
- retaining data after the source PVC is deleted;
- importing a provider snapshot into another compatible cluster;
- feeding an off-cluster snapshot data mover.

Snapshots provide better recovery metadata and lifecycle separation. They still are not automatically off-cluster backups: Kubernetes saves references and status, while the provider normally retains the actual snapshot data.

## Validate Driver Support Instead of Assuming

There is no universal user-facing capability field that proves every clone and snapshot path works for a particular class. Check the CSI driver's official feature matrix and perform tests:

1. Create a small source PVC and write known data.
2. Stop its writer if required.
3. Clone it and verify the destination.
4. Create a snapshot, wait for readiness, and restore it.
5. Test a larger destination and the required access and volume modes.
6. Delete test objects and verify backend cleanup.
7. Repeat after driver, Kubernetes, or storage-platform upgrades.

Read PVC events and CSI controller logs when provisioning remains `Pending`. A bound destination proves the storage operation completed, but application-level checks prove the contents are useful.

The decision is ultimately about lifecycle: clone when the desired artifact is another active volume; snapshot when the desired artifact is a managed recovery point.

## Official Documentation

- [Kubernetes: CSI Volume Cloning](https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/)
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes CSI Developer Documentation: Snapshot and Restore](https://kubernetes-csi.github.io/docs/snapshot-restore-feature)
- [Kubernetes CSI Developer Documentation: VolumeSnapshot API](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)

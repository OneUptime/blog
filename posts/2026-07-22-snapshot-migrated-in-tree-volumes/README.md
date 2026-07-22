# How to Snapshot Legacy In-Tree Volumes After Migrating to a CSI Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI Migration, In-Tree Volume, VolumeSnapshot, PersistentVolume, Storage Migration

Description: Convert or move legacy in-tree PersistentVolumes into native CSI ownership before relying on Kubernetes volume snapshots.

---

Kubernetes CSI Migration can route ordinary operations for a legacy in-tree volume through a replacement CSI driver, but it does not turn the stored PersistentVolume object into a native CSI volume that the snapshot API can necessarily use. Kubernetes documents snapshotting as a CSI-only feature and specifically advises manually re-importing an existing in-tree PV as a CSI PV to use new capabilities such as snapshots.

Do not patch a bound PV's volume source in place. Choose a vendor-supported static re-import, create and import a provider snapshot, or copy the data into a newly provisioned CSI PVC.

## Understand What CSI Migration Does

The core `CSIMigration` framework translates operations against supported in-tree plugins to an installed CSI driver. Current Kubernetes documentation lists provisioning and deletion, attach and detach, mount and unmount, and resizing among the redirected operations. Existing manifests can continue to show a legacy field such as an in-tree cloud disk source.

Inspect a PV:

```bash
pv=$(kubectl -n archive get pvc archive-data -o jsonpath='{.spec.volumeName}')
kubectl get pv "$pv" -o yaml
```

A migrated legacy object may have:

- an in-tree volume source rather than `spec.csi`;
- `pv.kubernetes.io/provisioned-by` naming the old provisioner;
- `pv.kubernetes.io/migrated-to` naming the CSI driver.

That annotation tells Kubernetes controllers to stand down so the CSI external provisioner can act. It is not proof that the PV is ready for `VolumeSnapshot`. The snapshot controller needs a CSI identity and a driver that implements snapshot creation and restoration.

## Verify the Replacement Driver First

Before touching data, confirm:

```bash
kubectl get csidriver
kubectl get storageclass
kubectl get volumesnapshotclass
kubectl -n kube-system get pods
```

Check the Kubernetes version and distribution's migration status for the specific in-tree plugin. The generic migration framework is stable, but provider migrations, removed plugins, and driver installation responsibilities differ. The cluster does not install the vendor CSI driver automatically.

Then read the vendor's migration documentation for:

- how the legacy backend volume ID maps to CSI `volumeHandle`;
- required `volumeAttributes` and secret references;
- topology or node-affinity conversion;
- filesystem type and mount options;
- whether statically imported legacy volumes support snapshots;
- supported Kubernetes and sidecar versions.

Never guess the CSI handle from a cloud console label. An attach request against a wrong or reused handle can expose another volume.

## Path 1: Re-import the Backend Volume as a Native CSI PV

This path keeps the existing provider disk but replaces its Kubernetes representation. It requires a maintenance window and a vendor-supported static-volume format.

The controlled sequence is:

1. Back up the application through an independent method.
2. Quiesce it and stop every pod that can write to the PVC.
3. Wait for detach and confirm no `VolumeAttachment` or node mount remains.
4. Change the legacy PV reclaim policy to `Retain`.
5. Record the PV, PVC, backend ID, filesystem, topology, and permissions.
6. Release and remove the old Kubernetes binding without deleting the backend volume.
7. Create a new static PV using `spec.csi` and the vendor's exact handle.
8. Create or rebind the PVC explicitly to that PV.
9. Mount it in isolation and validate data before resuming the application.

The target shape is similar to this, but all CSI fields are driver-specific:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: archive-data-csi
spec:
  capacity:
    storage: 200Gi
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  persistentVolumeReclaimPolicy: Retain
  storageClassName: archive-csi-static
  claimRef:
    name: archive-data
    namespace: archive
  csi:
    driver: example.csi.storage.io
    volumeHandle: vendor-confirmed-backend-volume-id
    fsType: ext4
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: archive-data
  namespace: archive
spec:
  storageClassName: archive-csi-static
  volumeName: archive-data-csi
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 200Gi
```

Real cloud and storage drivers often require topology, attributes, or secrets omitted here. Preserve the original filesystem; allowing Kubernetes to format an existing data disk would be destructive. Keep reclaim policy `Retain` until snapshot and restore tests succeed.

Deleting the old PVC or PV is not universally safe. Reclaim policy must be changed and verified first, and provider automation can add finalizers or deletion behavior. Rehearse the exact sequence with a cloned non-production volume.

## Path 2: Create a Provider Snapshot and Import It

Some providers can snapshot the legacy disk through their native API, and the CSI driver can consume that provider snapshot. Quiesce the application, create the provider snapshot, and record its immutable identifier. Then represent it in Kubernetes as a pre-provisioned `VolumeSnapshotContent`:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotContent
metadata:
  name: archive-legacy-import
spec:
  deletionPolicy: Retain
  driver: example.csi.storage.io
  source:
    snapshotHandle: vendor-snapshot-id
  sourceVolumeMode: Filesystem
  volumeSnapshotRef:
    name: archive-legacy
    namespace: archive
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: archive-legacy
  namespace: archive
spec:
  source:
    volumeSnapshotContentName: archive-legacy-import
```

This works only when the CSI driver documents that it recognizes the provider-generated handle and can create a volume from it. Wait for binding and readiness, then restore a new CSI PVC and validate it. Do not assume every native provider snapshot format is accepted through CSI.

This path also avoids rewriting the original PV during the first test: the restored PVC is a new CSI-native volume. After validation, the workload can cut over to it and future snapshots can use the normal Kubernetes API.

## Path 3: Copy Into a New CSI PVC

When static import is unsupported or too risky, provision a new PVC from a CSI StorageClass and copy data at the application or filesystem layer.

For databases, replication, logical export, or a vendor physical backup is usually safer than `rsync` against live files. For ordinary files, perform an initial copy while the application runs, pause writes, do a final incremental sync, verify hashes and ownership, and then switch the workload.

This path is slower but cleanly separates old and new ownership. It is also the only general path when the legacy volume type has no CSI migration or the new driver cannot adopt the existing backend asset.

## Create and Test the First CSI Snapshot

Only after the source PV visibly contains the correct native `spec.csi.driver` should you create a dynamic snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: archive-post-csi-migration
  namespace: archive
spec:
  volumeSnapshotClassName: archive-csi-snapshots
  source:
    persistentVolumeClaimName: archive-data
```

Check that the class driver exactly matches the PV driver, then wait:

```bash
kubectl -n archive wait --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/archive-post-csi-migration --timeout=20m
kubectl -n archive describe volumesnapshot archive-post-csi-migration
```

Restore it to a new PVC of at least `status.restoreSize`. Mount that PVC in an isolated pod and validate application data. Snapshot creation alone does not prove that restoration, topology, filesystem expansion, or database recovery works.

## Avoid Common Migration Mistakes

- Do not assume `pv.kubernetes.io/migrated-to` changes the stored volume source.
- Do not patch `spec.csi` onto a bound PV.
- Do not reuse a backend disk from two PV objects at the same time.
- Do not delete the legacy PV before verifying `Retain` and provider state.
- Do not omit topology when the volume is zonal.
- Do not select a snapshot class for a different CSI driver.
- Do not snapshot a live multi-volume database sequentially and call it application-consistent.
- Do not retire the independent backup until a CSI restore has passed validation.

CSI migration preserves compatibility for old APIs. Native re-import or data movement establishes a clean ownership model for new CSI-only capabilities. Treat those as two distinct projects.

## Official Documentation

- [Kubernetes: Migrating to CSI Drivers from In-tree Plugins](https://kubernetes.io/docs/concepts/storage/volumes/#migrating-to-csi-drivers-from-in-tree-plugins)
- [Kubernetes: CSI Migration Status and Snapshot Limitation](https://kubernetes.io/blog/2021/12/10/storage-in-tree-to-csi-migration-status-update/)
- [Kubernetes: `pv.kubernetes.io/migrated-to` Annotation](https://kubernetes.io/docs/reference/labels-annotations-taints/#pv-kubernetes-io-migrated-to)
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes: Importing a Pre-existing Volume Snapshot](https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/#importing-an-existing-volume-snapshot-with-kubernetes)
- [Kubernetes: PersistentVolume Pre-binding](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#reserving-a-persistentvolume)

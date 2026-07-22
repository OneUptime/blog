# Migrate CSI Snapshots and Persistent Volumes Between Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, VolumeSnapshot, PersistentVolume, Cluster Migration, Velero

Description: Migrate CSI-backed data safely by choosing between snapshot-handle import, snapshot data movement, and file-level transfer.

---

A Kubernetes manifest does not move storage data. To migrate a CSI volume, first decide whether the target cluster can access the same provider snapshot through the same CSI driver. If it can, preserve and import the snapshot handle. If it cannot, move the bytes with a data mover, file-system backup, or application-native migration.

Do not copy an old PersistentVolume's `volumeHandle` into a new cluster and hope that Kubernetes transfers it. That handle names an existing provider volume; it is only usable if storage ownership, topology, permissions, and attach safety have already been solved.

Also decide whether this is a migration or a disaster-recovery exercise. A planned migration can coordinate both clusters and a final write fence. Disaster recovery must work with the source cluster completely unavailable, so every required catalog entry, credential, and key must already exist elsewhere.

## Choose the Migration Path

Use **static snapshot import** when all of these are true:

- source and target use the same CSI driver name;
- the target storage identity can access the provider snapshot;
- the snapshot exists in a compatible account, project, region, zone, and encryption context;
- the target driver supports creating volumes from that snapshot;
- provider documentation supports the sharing or copying operation.

Use **Velero CSI Snapshot Data Movement** or **File System Backup** when the driver, provider, account boundary, or snapshot format differs. Use a database-native replication or backup tool when minimal downtime, logical conversion, point-in-time recovery, or version migration is required.

## Inventory Before Cutover

Record the data and every dependency:

```bash
kubectl get pvc,pv -A -o wide
kubectl get volumesnapshot -A
kubectl get volumesnapshotcontent
kubectl get storageclass,volumesnapshotclass
kubectl get csidriver
```

For each PVC, capture:

- namespace, claim name, requested capacity, access modes, and `volumeMode`;
- source PV and `spec.csi.driver`, `volumeHandle`, filesystem type, and attributes;
- StorageClass provisioner, parameters, binding mode, and expansion support;
- workload volume name, mount path, and `subPath`;
- snapshot content, provider `snapshotHandle`, `restoreSize`, and deletion policy;
- region or zone, encryption key, secret dependency, and application owner.

Export workload objects through a backup product or declarative source, but plan target substitutions for StorageClasses, image registries, identities, load balancers, and topology. Status fields and cluster-generated UIDs should not be treated as portable desired state.

## Preserve a Final Snapshot

Quiesce the application according to vendor guidance, or stop its writers. For multi-volume data, use a supported CSI volume group snapshot or hold the application quiesced across the complete snapshot set. Wait for each `VolumeSnapshot` to report `readyToUse: true`.

Before dismantling the source cluster, change each migration snapshot's content to `Retain` if the provider snapshot must survive deletion of the namespaced object:

```bash
content=$(kubectl -n source-app get volumesnapshot final-cutover \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

kubectl patch volumesnapshotcontent "$content" --type=merge \
  -p '{"spec":{"deletionPolicy":"Retain"}}'

kubectl get volumesnapshotcontent "$content" -o yaml
```

Store the driver, `status.snapshotHandle`, source volume mode, size, creation time, and provider metadata in the migration record. Do not rely only on an API export: a `VolumeSnapshotContent` contains a reference to the old namespaced object and cannot be reapplied unchanged as a new binding.

## Import a Handle Into the Target Cluster

Install the target CSI driver, snapshot CRDs, common snapshot controller, driver snapshotter sidecar, and a compatible StorageClass. Ensure the provider snapshot has been shared or copied into the target's accessible scope. A provider copy usually has a new handle; use that new value.

As a cluster administrator, create a pre-provisioned content object and matching namespaced snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotContent
metadata:
  name: orders-final-import
spec:
  deletionPolicy: Retain
  driver: example.csi.storage.io
  source:
    snapshotHandle: provider-snapshot-copy-91ac
  sourceVolumeMode: Filesystem
  volumeSnapshotRef:
    name: orders-final
    namespace: orders
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: orders-final
  namespace: orders
spec:
  source:
    volumeSnapshotContentName: orders-final-import
```

The names and namespace in both objects must match. The content is cluster-scoped and its reference reserves the snapshot for that exact namespaced object. Wait for bidirectional binding and readiness:

```bash
kubectl -n orders wait --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/orders-final --timeout=20m
kubectl -n orders get volumesnapshot orders-final -o yaml
kubectl get volumesnapshotcontent orders-final-import -o yaml
```

If an imported snapshot has no `restoreSize`, the driver may not support listing size metadata. Use provider metadata and request at least the source capacity.

## Provision a New Target Volume

Create a new PVC rather than reusing the source PV object:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: orders-data
  namespace: orders
spec:
  storageClassName: premium-target
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 500Gi
  dataSource:
    name: orders-final
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

The target StorageClass must use the same CSI driver as the imported snapshot and support restoration. Preserve `volumeMode`; Kubernetes blocks unauthorized mode conversion. Capacity must be at least `restoreSize`, and provider quotas and topology must allow a new volume.

Mount this PVC in an isolated inspection pod before starting the application. Validate files, database recovery, permissions, ownership, and expected records. Keep the imported snapshot retained until the target is accepted.

## Move Data When Handles Are Not Portable

A CSI `snapshotHandle` is opaque and driver-specific. It cannot be translated from one vendor to another. Even equal driver names do not guarantee cross-region or cross-account access.

Velero CSI Snapshot Data Movement creates a source CSI snapshot and uploads its data through a mover to object storage. On the target, Velero downloads into a dynamically provisioned PVC. Configure a working target StorageClass; if its name differs, use Velero's documented PV/PVC StorageClass mapping during restore.

Velero File System Backup is an alternative when snapshots are unavailable. It requires the source volume to be mounted by a pod and reads the live filesystem over time. Quiesce stateful applications and account for its node-agent privileges and transfer duration.

For databases, consider logical export, native physical backup, continuous log shipping, or replication. Those can provide version-aware validation and a shorter final write outage than copying a large volume after shutdown.

## Perform a Controlled Cutover

Use a rehearsal and a final run:

1. Restore an earlier recovery point in the target and measure transfer, provisioning, and application recovery.
2. Pre-create target infrastructure, CRDs, operators, policies, and storage classes.
3. Stop or fence source writes.
4. Capture the final application-consistent recovery point or complete the final replication sync.
5. Restore and validate the target while external side effects remain disabled.
6. Switch traffic only after application and data checks pass.
7. Prevent split-brain by keeping the source fenced.
8. Retain the source recovery point for an approved rollback window.
9. Reclaim snapshots, volumes, and keys through audited lifecycle procedures.

Back up Kubernetes resources as well as data, but restore controllers and CRDs before objects that depend on them. Be cautious with restored Services, node ports, cloud identities, and operators that might immediately act on external systems.

Migration succeeds when the target owns a newly provisioned, validated volume and the source can be retired without hidden dependencies. Moving YAML is only the control-plane portion of that outcome.

## Official Documentation

- [Kubernetes: Volume Snapshots and Pre-provisioned Binding](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI Developer Documentation: VolumeSnapshot API](https://kubernetes-csi.github.io/docs/api/volume-snapshot.html)
- [Kubernetes: Importing an Existing Snapshot](https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/#importing-an-existing-volume-snapshot-with-kubernetes)
- [Kubernetes: CSI Volumes and Volume Handles](https://kubernetes.io/docs/concepts/storage/volumes/#csi)
- [Velero: CSI Snapshot Data Movement](https://velero.io/docs/main/csi-snapshot-data-movement/)
- [Velero 1.18: Restore Reference](https://velero.io/docs/v1.18/restore-reference/)
- [Velero 1.18: File System Backup](https://velero.io/docs/v1.18/file-system-backup)

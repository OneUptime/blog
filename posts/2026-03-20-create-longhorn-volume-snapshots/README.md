# How to Create Longhorn Volume Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Snapshot, Data Protection

Description: Learn how to create, manage, and restore from Longhorn volume snapshots to protect your data and enable point-in-time recovery.

## Introduction

Longhorn snapshots are point-in-time copies of a volume's state stored on the same cluster. They allow you to quickly revert a volume to a previous state, making them ideal for application updates, testing, and recovering from accidental data loss. Unlike backups, snapshots do not require an external backup target but are also not protected against node failures.

## Understanding Snapshots vs Backups

| Feature | Snapshot | Backup |
|---------|----------|--------|
| Storage location | Local cluster | External (S3, NFS) |
| Speed | Very fast | Slower (incremental) |
| Space efficiency | Incremental (copy-on-write) | Incremental |
| Disaster recovery | No (same cluster) | Yes |
| Retention | Manual or scheduled | Configurable |

## Creating a Snapshot via Longhorn UI

1. Open the Longhorn UI
2. Navigate to **Volume**
3. Click on the volume name to open volume details
4. In the **Snapshot** section, click **Take Snapshot**
5. Enter a name (or leave blank for auto-generated)
6. Click **OK**

The snapshot appears in the snapshot chain below the volume details.

## Creating a Snapshot via kubectl

Use the Longhorn `Snapshot` custom resource:

```yaml
# longhorn-snapshot.yaml - Create a snapshot of a Longhorn volume

apiVersion: longhorn.io/v1beta2
kind: Snapshot
metadata:
  # The snapshot name
  name: my-volume-snapshot-20260320
  namespace: longhorn-system
spec:
  # Reference to the Longhorn volume
  volume: my-longhorn-volume
  # Create the snapshot immediately
  createSnapshot: true
```

```bash
kubectl apply -f longhorn-snapshot.yaml

# Check the snapshot status
kubectl get snapshots.longhorn.io -n longhorn-system
kubectl describe snapshot.longhorn.io my-volume-snapshot-20260320 -n longhorn-system
```

## Creating Snapshots Using Kubernetes VolumeSnapshot API

Longhorn supports the Kubernetes CSI snapshot API, which is the standard way to create snapshots in Kubernetes:

### Step 1: Verify VolumeSnapshot CRDs are Installed

```bash
# Check if VolumeSnapshot CRDs are available
kubectl get crd volumesnapshots.snapshot.storage.k8s.io
kubectl get crd volumesnapshotclasses.snapshot.storage.k8s.io
kubectl get crd volumesnapshotcontents.snapshot.storage.k8s.io
```

If not installed:

```bash
# Install the VolumeSnapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.3/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.3/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.3/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
```

### Step 2: Create a VolumeSnapshotClass

```yaml
# volume-snapshot-class.yaml - Longhorn VolumeSnapshotClass
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: longhorn-snapshot-class
  annotations:
    # Set this as the default VolumeSnapshotClass
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: driver.longhorn.io
deletionPolicy: Delete   # Delete snapshot when VolumeSnapshot object is deleted
parameters:
  # type=snap creates a Longhorn (in-cluster) snapshot.
  # Omitting this parameter defaults to a backup (type=bak), which requires a backup target.
  type: snap
```

```bash
kubectl apply -f volume-snapshot-class.yaml
```

### Step 3: Create a VolumeSnapshot

```yaml
# volume-snapshot.yaml - Create a snapshot of a PVC
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: app-data-snapshot-20260320
  namespace: default
spec:
  # Reference the VolumeSnapshotClass
  volumeSnapshotClassName: longhorn-snapshot-class
  source:
    # Reference the PVC to snapshot
    persistentVolumeClaimName: my-app-data
```

```bash
kubectl apply -f volume-snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot app-data-snapshot-20260320
kubectl describe volumesnapshot app-data-snapshot-20260320
```

## Restoring from a Snapshot

### Via Longhorn UI

1. Navigate to the volume's snapshot list
2. Find the snapshot you want to restore
3. Click the **Revert** button next to the snapshot
4. Confirm the operation

> **Warning:** Reverting overwrites the current volume state. The pod using the volume must be stopped first.

### Create a New PVC from a Snapshot

To restore to a new PVC without overwriting the existing one:

```yaml
# pvc-from-snapshot.yaml - Create a new PVC from an existing snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-app-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi  # Must be >= original size
  dataSource:
    # Reference the VolumeSnapshot as the data source
    name: app-data-snapshot-20260320
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

```bash
kubectl apply -f pvc-from-snapshot.yaml

# The new PVC will be pre-populated with data from the snapshot
kubectl get pvc restored-app-data
```

## Listing and Managing Snapshots

```bash
# List all VolumeSnapshots
kubectl get volumesnapshots --all-namespaces

# List Longhorn native snapshots
kubectl get snapshots.longhorn.io -n longhorn-system

# Delete a specific snapshot
kubectl delete volumesnapshot app-data-snapshot-20260320
```

## Conclusion

Longhorn snapshots provide fast, efficient point-in-time copies of your volumes for data protection and recovery scenarios. For comprehensive disaster recovery, combine snapshots with off-cluster backups. Using the standard Kubernetes VolumeSnapshot API ensures portability and compatibility with tools like Velero. Always test your restore procedures regularly to ensure they work as expected before you need them in an emergency.

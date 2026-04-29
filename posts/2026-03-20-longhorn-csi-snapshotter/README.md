# How to Configure Longhorn CSI Snapshotter - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, CSI, Snapshot, Kubernetes, VolumeSnapshot, Storage, SUSE Rancher

Description: Learn how to configure the Longhorn CSI snapshotter to create, manage, and restore Kubernetes VolumeSnapshots using the standard CSI snapshot API.

---

Longhorn integrates with the Kubernetes CSI snapshots API, allowing you to create, list, and restore volume snapshots using standard Kubernetes objects (`VolumeSnapshot`, `VolumeSnapshotClass`, `VolumeSnapshotContent`).

---

## Step 1: Install CSI Snapshot Controller

The CSI snapshot controller and snapshot CRDs must be available in the cluster before Longhorn can use the snapshot API. If your Kubernetes distribution does not already provide them, install the release documented for your Longhorn version. For Longhorn 1.11.1, use `external-snapshotter` `v8.5.0`:

```bash
git clone --branch v8.5.0 https://github.com/kubernetes-csi/external-snapshotter.git
cd external-snapshotter

# Install the CSI snapshot CRDs
kubectl create -k client/config/crd

# Install the snapshot controller
kubectl create -k deploy/kubernetes/snapshot-controller
```

---

## Step 2: Create a VolumeSnapshotClass

```yaml
# longhorn-snapshotclass.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: longhorn-snapshot-vsc
  annotations:
    # Make this the default snapshot class
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: driver.longhorn.io
deletionPolicy: Delete
parameters:
  # Use `snap` for a local Longhorn snapshot
  # Use `bak` for a Longhorn backup in the configured backup target
  type: snap
```

---

## Step 3: Create a VolumeSnapshot

```yaml
# volume-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: myapp-data-snapshot-v1
  namespace: my-app
spec:
  volumeSnapshotClassName: longhorn-snapshot-vsc
  source:
    # Reference the PVC to snapshot
    persistentVolumeClaimName: myapp-data
```

```bash
kubectl apply -f volume-snapshot.yaml

# Check snapshot is ready
kubectl get volumesnapshot myapp-data-snapshot-v1 -n my-app
```

---

## Step 4: Restore from a VolumeSnapshot

Create a new PVC from the snapshot:

```yaml
# restored-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-data-restored
  namespace: my-app
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi # Must match the source volume size captured by the snapshot
  # Restore from the snapshot
  dataSource:
    name: myapp-data-snapshot-v1
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

---

## Step 5: List and Delete Snapshots

```bash
# List all snapshots
kubectl get volumesnapshot -A

# List snapshot contents (the backing Kubernetes snapshot objects)
kubectl get volumesnapshotcontent

# Delete a snapshot
kubectl delete volumesnapshot myapp-data-snapshot-v1 -n my-app
```

---

## Step 6: Automate Longhorn Snapshots via Longhorn Recurring Jobs

The following `RecurringJob` automates Longhorn snapshots. After creating it, assign it to the PVC so Longhorn syncs the job to the backing volume:

```yaml
# recurring-snapshot-job.yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-snapshot
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"   # Daily at 2 AM
  task: snapshot
  groups:
    - default
  retain: 7            # Keep last 7 daily snapshots
  concurrency: 2
```

```bash
kubectl apply -f recurring-snapshot-job.yaml

# Assign the recurring job to the PVC
kubectl -n my-app label pvc/myapp-data recurring-job.longhorn.io/source=enabled
kubectl -n my-app label pvc/myapp-data recurring-job.longhorn.io/daily-snapshot=enabled
```

---

## Best Practices

- Use `type: bak` in the VolumeSnapshotClass to create off-cluster backups (requires a Longhorn backup target).
- Use Longhorn RecurringJobs to automate Longhorn snapshots or backups; they do not create Kubernetes `VolumeSnapshot` objects.
- Test snapshot restore regularly - create a restore and verify data integrity before relying on snapshots or backups for disaster recovery.

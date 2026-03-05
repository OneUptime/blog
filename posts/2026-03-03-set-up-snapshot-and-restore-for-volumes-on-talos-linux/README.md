# How to Set Up Snapshot and Restore for Volumes on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Volume Snapshots, Backup, Disaster Recovery

Description: Learn how to configure volume snapshots and restore workflows for persistent data on Talos Linux clusters.

---

Backing up your data is not optional. If you are running stateful workloads on Kubernetes, you need a reliable way to snapshot volumes and restore them when things go wrong. On Talos Linux, the immutable and API-driven nature of the OS means that all backup operations happen through Kubernetes APIs and CSI drivers rather than through traditional backup tools on the host.

This guide covers setting up the Kubernetes Volume Snapshot feature, creating snapshots, restoring from them, and building automated backup workflows.

## Understanding Volume Snapshots in Kubernetes

Kubernetes Volume Snapshots are a cluster-level API for creating point-in-time copies of PersistentVolumes. They work similarly to how snapshots work in cloud environments or with traditional storage arrays. The feature has three main components.

VolumeSnapshot is the request to create a snapshot of a specific PVC. VolumeSnapshotContent is the actual snapshot, analogous to how PersistentVolume relates to PersistentVolumeClaim. VolumeSnapshotClass defines the parameters and driver used for creating snapshots.

## Setting Up the Snapshot Controller

The snapshot controller is not included in the default Kubernetes installation. You need to deploy it separately.

```bash
# Install the snapshot controller CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/release-6.3/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/release-6.3/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/release-6.3/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml

# Install the snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/release-6.3/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/release-6.3/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

Verify the controller is running.

```bash
# Check snapshot controller pods
kubectl get pods -n kube-system -l app=snapshot-controller

# Verify CRDs are installed
kubectl get crd | grep volumesnapshot
```

## Creating a VolumeSnapshotClass

A VolumeSnapshotClass defines how snapshots are created and which CSI driver to use. You need at least one VolumeSnapshotClass per storage backend.

### For Longhorn

```yaml
# VolumeSnapshotClass for Longhorn
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: longhorn-snapshot
driver: driver.longhorn.io
deletionPolicy: Delete
parameters:
  type: snap
```

### For Rook-Ceph RBD

```yaml
# VolumeSnapshotClass for Rook-Ceph
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ceph-rbd-snapshot
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
```

### For Local Path with OpenEBS

```yaml
# VolumeSnapshotClass for OpenEBS LocalPV-ZFS
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: openebs-zfs-snapshot
driver: zfs.csi.openebs.io
deletionPolicy: Delete
```

## Creating a Volume Snapshot

To create a snapshot, you create a VolumeSnapshot resource that references the PVC you want to back up.

```yaml
# Create a snapshot of a database PVC
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: db-snapshot-2026-03-03
  namespace: database
spec:
  volumeSnapshotClassName: longhorn-snapshot
  source:
    persistentVolumeClaimName: postgres-data
```

Apply it and monitor the progress.

```bash
# Create the snapshot
kubectl apply -f snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot -n database

# Verify the snapshot is ready
kubectl get volumesnapshot db-snapshot-2026-03-03 -n database \
  -o jsonpath='{.status.readyToUse}'
```

A snapshot should show `readyToUse: true` once it is complete.

```bash
# Get detailed snapshot information
kubectl describe volumesnapshot db-snapshot-2026-03-03 -n database

# Check the underlying VolumeSnapshotContent
kubectl get volumesnapshotcontent
```

## Restoring from a Snapshot

Restoring creates a new PVC from a snapshot. The new PVC will contain an exact copy of the data at the time the snapshot was taken.

```yaml
# Restore a PVC from a snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
  namespace: database
spec:
  storageClassName: longhorn
  dataSource:
    name: db-snapshot-2026-03-03
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi  # Must be >= original PVC size
```

```bash
# Apply the restore
kubectl apply -f restore-pvc.yaml

# Wait for the PVC to be bound
kubectl get pvc postgres-data-restored -n database -w
```

### Using the Restored PVC

Once the restored PVC is bound, you can use it with your workload.

```yaml
# Point your application to the restored PVC
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-restored
  namespace: database
spec:
  serviceName: postgres-restored
  replicas: 1
  selector:
    matchLabels:
      app: postgres-restored
  template:
    metadata:
      labels:
        app: postgres-restored
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgres-data-restored
```

## Automating Snapshots with CronJobs

Manual snapshots are good for one-off backups, but you should automate the process for production workloads.

```yaml
# CronJob to create daily snapshots
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-db-snapshot
  namespace: database
spec:
  schedule: "0 2 * * *"  # Every day at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          containers:
          - name: snapshot-creator
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Generate snapshot name with timestamp
              SNAP_NAME="db-snapshot-$(date +%Y%m%d-%H%M%S)"

              # Create the snapshot
              cat <<SNAPEOF | kubectl apply -f -
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: $SNAP_NAME
                namespace: database
                labels:
                  backup-type: daily
              spec:
                volumeSnapshotClassName: longhorn-snapshot
                source:
                  persistentVolumeClaimName: postgres-data
              SNAPEOF

              echo "Created snapshot: $SNAP_NAME"

              # Clean up old snapshots (keep last 7)
              kubectl get volumesnapshot -n database \
                -l backup-type=daily \
                --sort-by=.metadata.creationTimestamp \
                -o name | head -n -7 | xargs -r kubectl delete -n database
          restartPolicy: OnFailure
```

You need a ServiceAccount with the right permissions for the CronJob.

```yaml
# RBAC for snapshot automation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-creator
  namespace: database
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: snapshot-creator
  namespace: database
rules:
- apiGroups: ["snapshot.storage.k8s.io"]
  resources: ["volumesnapshots"]
  verbs: ["create", "delete", "get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: snapshot-creator
  namespace: database
subjects:
- kind: ServiceAccount
  name: snapshot-creator
roleRef:
  kind: Role
  name: snapshot-creator
  apiGroup: rbac.authorization.k8s.io
```

## Using Velero for Full Backup and Restore

For comprehensive backup and restore workflows that include not just volumes but also Kubernetes resources, Velero is the standard tool.

```bash
# Install Velero with Longhorn support
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket my-backup-bucket \
  --secret-file ./credentials \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --features=EnableCSI
```

Create a backup schedule.

```bash
# Create a daily backup schedule
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces=database,app \
  --ttl 168h  # Keep for 7 days

# Take a manual backup
velero backup create pre-migration-backup \
  --include-namespaces=database

# Restore from a backup
velero restore create --from-backup pre-migration-backup
```

## Testing Your Restore Process

Creating snapshots is only half the equation. You need to regularly test that your restores actually work.

```bash
# Create a test restore
kubectl create namespace restore-test

# Restore snapshot to test namespace
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restore-test-pvc
  namespace: restore-test
spec:
  storageClassName: longhorn
  dataSource:
    name: db-snapshot-2026-03-03
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
EOF

# Spin up a test pod to verify the data
kubectl run restore-check --namespace=restore-test \
  --image=postgres:15 \
  --overrides='{"spec":{"containers":[{"name":"restore-check","image":"postgres:15","volumeMounts":[{"name":"data","mountPath":"/var/lib/postgresql/data"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"restore-test-pvc"}}]}}'

# Verify the data
kubectl exec -n restore-test restore-check -- psql -U postgres -c "SELECT count(*) FROM important_table;"

# Clean up
kubectl delete namespace restore-test
```

## Conclusion

Volume snapshots on Talos Linux work through the standard Kubernetes Volume Snapshot API. The key steps are installing the snapshot controller, creating a VolumeSnapshotClass for your storage backend, and building automation around snapshot creation and retention. Always test your restores regularly. A backup you cannot restore from is not a backup at all. With automated snapshots, retention policies, and regular restore testing, you can protect your stateful workloads on Talos Linux from data loss.

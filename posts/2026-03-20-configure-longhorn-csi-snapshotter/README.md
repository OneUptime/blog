# How to Configure Longhorn CSI Snapshotter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, CSI, Snapshot, VolumeSnapshot

Description: Configure the Kubernetes CSI snapshotter components and VolumeSnapshotClasses to enable standard Kubernetes snapshot APIs with Longhorn storage.

## Introduction

The Kubernetes CSI Snapshotter is an external controller that works alongside CSI drivers to implement the Kubernetes `VolumeSnapshot` API. While Longhorn has its own native snapshot capability, enabling the CSI Snapshotter allows you to use the standard Kubernetes VolumeSnapshot API, which enables compatibility with tools like Velero and provides a uniform snapshot interface across different storage backends.

## Prerequisites

- Longhorn v1.3.0 or later (required for `type: snap`; earlier versions only support `type: bak`)
- Kubernetes v1.20 or later
- `kubectl` cluster access

## Install CSI Snapshotter CRDs and Controller

### Step 1: Install VolumeSnapshot CRDs

```bash
# Install the VolumeSnapshot CRDs (if not already present)

kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.3/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml

kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.3/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml

kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.3/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
```

### Step 2: Install the Snapshot Controller

```bash
# Install the snapshot controller (runs in kube-system namespace)
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.3/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml

kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.3/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

### Verify the Controller is Running

```bash
# Check the snapshot controller is running
kubectl get pods -n kube-system | grep snapshot-controller

# Check the CRDs are installed
kubectl get crd | grep volumesnapshot
```

## Create a Longhorn VolumeSnapshotClass

```yaml
# longhorn-volumesnapshotclass.yaml - VolumeSnapshotClass for Longhorn
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: longhorn-snapshot-class
  annotations:
    # Make this the default VolumeSnapshotClass
    snapshot.storage.kubernetes.io/is-default-class: "true"
# The Longhorn CSI driver
driver: driver.longhorn.io
# Delete the underlying snapshot when VolumeSnapshot is deleted
deletionPolicy: Delete
parameters:
  # Optional: specify backup type (snapshot or backup)
  type: snap   # "snap" creates a local snapshot; "bak" creates a backup to external storage
```

```bash
kubectl apply -f longhorn-volumesnapshotclass.yaml

# Verify the VolumeSnapshotClass was created
kubectl get volumesnapshotclass
```

## Creating Snapshots Using the Standard Kubernetes API

### Create a VolumeSnapshot

```yaml
# create-volumesnapshot.yaml - Standard Kubernetes VolumeSnapshot
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: my-app-snapshot-v1
  namespace: default
spec:
  # Reference the VolumeSnapshotClass
  volumeSnapshotClassName: longhorn-snapshot-class
  source:
    # Reference the PVC to snapshot
    persistentVolumeClaimName: my-app-data
```

```bash
kubectl apply -f create-volumesnapshot.yaml

# Check snapshot status
kubectl get volumesnapshot my-app-snapshot-v1
kubectl describe volumesnapshot my-app-snapshot-v1
```

Wait for the `READYTOUSE` field to show `true`.

### List VolumeSnapshots

```bash
# List all VolumeSnapshots in all namespaces
kubectl get volumesnapshots --all-namespaces

# Get VolumeSnapshotContents (the actual snapshot data reference)
kubectl get volumesnapshotcontents

# Get details of a specific snapshot
kubectl describe volumesnapshot my-app-snapshot-v1
```

## Restore from a VolumeSnapshot

```yaml
# restore-from-snapshot.yaml - PVC created from a VolumeSnapshot
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
      storage: 10Gi    # Must be >= the original volume size
  dataSource:
    # Reference the VolumeSnapshot as the data source
    apiGroup: snapshot.storage.k8s.io
    kind: VolumeSnapshot
    name: my-app-snapshot-v1
```

```bash
kubectl apply -f restore-from-snapshot.yaml

# Monitor the restore
kubectl get pvc restored-app-data -w

# Verify the restored data
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: verify-restore
spec:
  containers:
    - name: verify
      image: busybox
      command: ["ls", "-la", "/data"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: restored-app-data
  restartPolicy: Never
EOF

kubectl logs verify-restore
```

## Creating a VolumeSnapshotClass for Backups (Off-Cluster)

```yaml
# longhorn-backup-snapshotclass.yaml - VolumeSnapshotClass for off-cluster backups
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: longhorn-backup-class
driver: driver.longhorn.io
deletionPolicy: Retain   # Keep the backup data even if VolumeSnapshot is deleted
parameters:
  # "bak" creates a backup to the configured external backup target (S3, NFS, etc.)
  type: bak
```

```bash
kubectl apply -f longhorn-backup-snapshotclass.yaml

# Create a backup snapshot using this class
cat << 'EOF' | kubectl apply -f -
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: backup-snapshot-20260320
  namespace: default
spec:
  volumeSnapshotClassName: longhorn-backup-class
  source:
    persistentVolumeClaimName: my-app-data
EOF
```

## Automating Snapshots with CronJob

```yaml
# snapshot-cronjob.yaml - Automated daily snapshot via CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-snapshot
  namespace: default
spec:
  schedule: "0 2 * * *"   # Daily at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-sa  # Needs VolumeSnapshot creation permission
          restartPolicy: OnFailure
          containers:
            - name: create-snapshot
              image: bitnami/kubectl:latest
              command:
                - sh
                - -c
                - |
                  DATE=$(date +%Y%m%d-%H%M%S)
                  cat << EOF | kubectl apply -f -
                  apiVersion: snapshot.storage.k8s.io/v1
                  kind: VolumeSnapshot
                  metadata:
                    name: auto-snapshot-$DATE
                    namespace: default
                  spec:
                    volumeSnapshotClassName: longhorn-snapshot-class
                    source:
                      persistentVolumeClaimName: my-app-data
                  EOF
```

## Conclusion

The Kubernetes CSI Snapshotter provides a standardized API for volume snapshots that integrates Longhorn into the broader Kubernetes ecosystem. By installing the snapshot controller CRDs and creating appropriate VolumeSnapshotClasses, you can use tools like Velero for application-level backup coordination, write portable applications that use snapshots via standard APIs, and maintain a consistent snapshot experience regardless of the underlying storage driver.

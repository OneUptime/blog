# How to Restore Longhorn Volumes from Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Backup, Restore, Disaster Recovery

Description: Learn how to restore Longhorn volumes from backups stored in S3, NFS, or other backup targets to recover data after failures or migrations.

## Introduction

Restoring from backups is the most critical operation in any data protection system. Longhorn provides multiple methods to restore volumes from external backups - whether you're recovering from a disaster, migrating to a new cluster, or testing your recovery procedures. This guide covers common restore methods with step-by-step instructions.

## Prerequisites

- Longhorn installed with a configured backup target (S3, NFS, Azure Blob, or GCS)
- Access to the backup target where volume backups are stored
- Sufficient disk space on the cluster for the restored volume

## Understanding Restore Options

| Restore Method | Description | When to Use |
|----------------|-------------|-------------|
| New volume | Restore to a new Longhorn volume | Data recovery, migration |
| New PVC | Provision a new PVC from backup | Rollback after corruption |
| Cross-cluster | Restore to a different cluster | Disaster recovery |
| Disaster Recovery volume | Long-running restore + failover | DR scenarios |

## Method 1: Restore via Longhorn UI

### Step 1: Navigate to Backups

1. Open the Longhorn UI
2. Navigate to **Backup**
3. The backup list shows all volumes that have backups

### Step 2: Select a Backup

1. Click on the volume name to see all its backups
2. Find the backup you want to restore
3. Click the three-dot menu (⋮) next to the backup
4. Select **Restore Latest Backup** or **Restore**

### Step 3: Configure the Restore

- **Name**: New volume name (e.g., `restored-my-volume`)

### Step 4: Create a PV/PVC for the Restored Volume

After restoration, the volume appears as **Detached**. Create a PV/PVC to use it with Kubernetes:

```yaml
# pv-restored.yaml - PersistentVolume pointing to the restored Longhorn volume

apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-restored-myvolume
spec:
  capacity:
    storage: 10Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: longhorn
  csi:
    driver: driver.longhorn.io
    fsType: ext4
    # Reference the restored Longhorn volume name
    volumeHandle: restored-my-volume
    volumeAttributes:
      storage.kubernetes.io/csiProvisionerIdentity: driver.longhorn.io
```

```bash
kubectl apply -f pv-restored.yaml
```

Then create a PVC that binds to this PV:

```yaml
# pvc-restored.yaml - PVC bound to the restored volume
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-restored-myvolume
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  # Bind to the specific PV
  volumeName: pv-restored-myvolume
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f pvc-restored.yaml
kubectl get pvc pvc-restored-myvolume
```

## Method 2: Restore via StorageClass (Recommended for Kubernetes Workloads)

The cleanest way to restore a backup into Kubernetes is using the `fromBackup` StorageClass parameter:

### Step 1: Get the Backup URL

```bash
# List backups and get the exact backup URL
kubectl get backups.longhorn.io -n longhorn-system
kubectl get backup.longhorn.io <backup-name> -n longhorn-system -o jsonpath='{.status.url}'
```

Or from the Longhorn UI, click on a backup and find the backup URL in the details.

### Step 2: Create a StorageClass with fromBackup

```yaml
# storageclass-restore.yaml - Temporary StorageClass for restore
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-restore
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  fsType: "ext4"
  # Specify the backup URL to restore from
  fromBackup: "s3://my-backup-bucket@us-east-1/?volume=my-volume&backup=backup-20260320"
```

```bash
kubectl apply -f storageclass-restore.yaml
```

### Step 3: Create a PVC Using the Restore StorageClass

```yaml
# pvc-from-backup.yaml - PVC that will restore from the specified backup
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  # Use the restore StorageClass
  storageClassName: longhorn-restore
  resources:
    requests:
      # Use the original backup volume size
      storage: 10Gi
```

```bash
kubectl apply -f pvc-from-backup.yaml

# Monitor restore progress
kubectl get pvc restored-data -w
kubectl describe pvc restored-data
```

## Method 3: Restore via kubectl (Longhorn Volume Custom Resource)

Get the volume size from the Backup CR before creating the manifest:

```bash
kubectl get backup.longhorn.io <backup-name> -n longhorn-system -o jsonpath='{.status.volumeSize}'
```

```yaml
# longhorn-restore.yaml - Restore a Longhorn volume from backup
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: my-restored-volume
  namespace: longhorn-system
spec:
  size: "10737418240"    # Must match the Backup CR .status.volumeSize value
  numberOfReplicas: 3
  fromBackup: "s3://my-bucket@us-east-1/?volume=my-volume&backup=backup-20260320"
  accessMode: rwo
  frontend: blockdev
  dataEngine: v1
```

```bash
kubectl apply -f longhorn-restore.yaml

# Monitor restore progress
kubectl get volumes.longhorn.io my-restored-volume -n longhorn-system -w
```

## Cross-Cluster Restore

To restore a backup from one cluster to another:

### Step 1: Configure the Same Backup Target on the New Cluster

Ensure the new cluster's Longhorn instance is configured with the same backup target URL and credentials.

### Step 2: Scan Backup Target

```bash
# In the new cluster, request a backup target sync to discover available backups
kubectl patch backuptarget.longhorn.io default \
  -n longhorn-system \
  --type merge \
  -p "{\"spec\":{\"syncRequestedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}"
```

Or from the Longhorn UI, navigate to **Backup** and click **Sync All Backup Volumes**.

### Step 3: Restore the Backup

Follow the same restore procedure as Method 2 or Method 3 on the new cluster.

## Verify the Restored Data

```bash
# Create a pod to verify the restored data
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: restore-verify
spec:
  containers:
    - name: verify
      image: busybox
      command: ["sh", "-c", "ls -la /data && cat /data/test.txt 2>/dev/null; sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: restored-data
EOF

kubectl exec restore-verify -- ls -la /data
```

## Conclusion

Longhorn's restore functionality provides flexible options for recovering data from external backups. The `fromBackup` StorageClass method is the most Kubernetes-native approach, allowing you to restore directly into a new PVC. For disaster recovery scenarios involving full cluster loss, cross-cluster restore using the same backup target gives you a reliable recovery path. Always test your restore procedures regularly to ensure your backups are valid and your recovery time objectives (RTO) can be met.

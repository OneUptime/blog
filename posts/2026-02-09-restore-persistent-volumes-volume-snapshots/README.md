# How to Restore Persistent Volumes from VolumeSnapshots in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Disaster Recovery, VolumeSnapshot

Description: Master the process of restoring persistent volumes from VolumeSnapshots in Kubernetes, including disaster recovery scenarios, data migration, and testing strategies.

---

Restoring data from VolumeSnapshots is the critical second half of any backup strategy. While creating snapshots protects your data, knowing how to restore them quickly and correctly determines whether you can actually recover from disasters.

## Understanding Volume Restoration

When you restore from a VolumeSnapshot, Kubernetes creates a new PersistentVolumeClaim (PVC) using the snapshot as a data source. The CSI driver handles copying the snapshot data to a new volume, which your pods can then mount.

The restoration process involves:

1. Creating a PVC that references the snapshot
2. CSI driver provisions a new volume from snapshot data
3. New pods mount the restored PVC
4. Application resumes operation with restored data

Unlike traditional backup tools that copy data over the network, CSI snapshots leverage storage provider features for efficient restoration.

## Basic Snapshot Restoration

Let's start with a simple restore operation. Assume you have an existing snapshot:

```bash
# List available snapshots
kubectl get volumesnapshot

# Example output:
# NAME                      READYTOUSE   SOURCEPVC   RESTORESIZE   AGE
# mysql-snapshot-20260209   true         mysql-pvc   10Gi          2h
```

Create a new PVC from the snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-restored-pvc
spec:
  # Reference the snapshot as the data source
  dataSource:
    name: mysql-snapshot-20260209
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  # Access mode must match original PVC
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      # Size must be >= snapshot restore size
      storage: 10Gi
  # Must use a StorageClass that supports snapshots
  storageClassName: standard
```

Apply the restore:

```bash
kubectl apply -f restore-pvc.yaml

# Monitor the restoration progress
kubectl get pvc mysql-restored-pvc -w

# Check for completion
kubectl describe pvc mysql-restored-pvc
```

The PVC will show `Bound` status when restoration completes:

```
Name:          mysql-restored-pvc
Namespace:     default
StorageClass:  standard
Status:        Bound
Volume:        pvc-xxxxx
Labels:        <none>
Capacity:      10Gi
Access Modes:  RWO
DataSource:
  APIGroup:  snapshot.storage.k8s.io
  Kind:      VolumeSnapshot
  Name:      mysql-snapshot-20260209
```

## Restoring to a New Application Instance

Deploy a new application using the restored data:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-restored
  labels:
    app: mysql-restored
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql-restored
  template:
    metadata:
      labels:
        app: mysql-restored
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "password123"
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-data
        persistentVolumeClaim:
          claimName: mysql-restored-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mysql-restored-service
spec:
  selector:
    app: mysql-restored
  ports:
  - protocol: TCP
    port: 3306
    targetPort: 3306
  type: ClusterIP
```

Deploy and verify the restoration:

```bash
kubectl apply -f mysql-restored.yaml

# Wait for pod to be ready
kubectl wait --for=condition=ready pod -l app=mysql-restored --timeout=120s

# Verify data was restored
kubectl exec -it deploy/mysql-restored -- mysql -uroot -ppassword123 -e "
USE testdb;
SELECT * FROM users;
"

# Expected output shows data from the snapshot:
# +----+---------+
# | id | name    |
# +----+---------+
# |  1 | Alice   |
# |  2 | Bob     |
# |  3 | Charlie |
# +----+---------+
```

## In-Place Restoration (Replace Existing PVC)

For disaster recovery where you need to replace corrupted data, follow this process:

```bash
# Step 1: Scale down the application to prevent data access
kubectl scale deployment mysql --replicas=0

# Wait for pods to terminate
kubectl wait --for=delete pod -l app=mysql --timeout=60s

# Step 2: Delete the corrupted PVC (this deletes the PV too if reclaimPolicy is Delete)
kubectl delete pvc mysql-pvc

# Step 3: Create new PVC with the same name from snapshot
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc  # Same name as original
spec:
  dataSource:
    name: mysql-snapshot-20260209
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
EOF

# Step 4: Wait for PVC to be bound
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/mysql-pvc --timeout=300s

# Step 5: Scale the application back up
kubectl scale deployment mysql --replicas=1

# Step 6: Verify the application is working
kubectl wait --for=condition=ready pod -l app=mysql --timeout=120s
kubectl exec -it deploy/mysql -- mysql -uroot -ppassword123 -e "SHOW DATABASES;"
```

## Restoring to a Different Namespace

For testing or migration, restore snapshots to different namespaces:

```bash
# Create the target namespace
kubectl create namespace recovery-test

# Create a snapshot reference in the target namespace
# Note: VolumeSnapshots are namespace-scoped
# If snapshot is in different namespace, you need to use VolumeSnapshotContent

# Get the VolumeSnapshotContent name
SNAPSHOT_CONTENT=$(kubectl get volumesnapshot mysql-snapshot-20260209 \
  -o jsonpath='{.status.boundVolumeSnapshotContentName}')

# Create PVC in new namespace referencing the content
kubectl apply -n recovery-test -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-test-pvc
spec:
  dataSource:
    name: ${SNAPSHOT_CONTENT}
    kind: VolumeSnapshotContent
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
EOF
```

However, a cleaner approach is to copy the snapshot:

```bash
# Copy snapshot to target namespace
kubectl get volumesnapshot mysql-snapshot-20260209 -o yaml | \
  sed 's/namespace: default/namespace: recovery-test/' | \
  kubectl apply -f -

# Now restore in the new namespace
kubectl apply -n recovery-test -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-test-pvc
spec:
  dataSource:
    name: mysql-snapshot-20260209
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
EOF
```

## Automated Disaster Recovery Script

Create a script to automate the recovery process:

```bash
#!/bin/bash
# restore-from-snapshot.sh

set -e

SNAPSHOT_NAME="${1}"
DEPLOYMENT_NAME="${2}"
PVC_NAME="${3}"

if [ -z "$SNAPSHOT_NAME" ] || [ -z "$DEPLOYMENT_NAME" ] || [ -z "$PVC_NAME" ]; then
    echo "Usage: $0 <snapshot-name> <deployment-name> <pvc-name>"
    exit 1
fi

echo "Starting disaster recovery process..."

# Verify snapshot exists and is ready
READY=$(kubectl get volumesnapshot "$SNAPSHOT_NAME" -o jsonpath='{.status.readyToUse}')
if [ "$READY" != "true" ]; then
    echo "ERROR: Snapshot $SNAPSHOT_NAME is not ready"
    exit 1
fi

# Get snapshot details
RESTORE_SIZE=$(kubectl get volumesnapshot "$SNAPSHOT_NAME" -o jsonpath='{.status.restoreSize}')
STORAGE_CLASS=$(kubectl get pvc "$PVC_NAME" -o jsonpath='{.spec.storageClassName}')
ACCESS_MODE=$(kubectl get pvc "$PVC_NAME" -o jsonpath='{.spec.accessModes[0]}')

echo "Snapshot: $SNAPSHOT_NAME"
echo "Size: $RESTORE_SIZE"
echo "StorageClass: $STORAGE_CLASS"

# Scale down the deployment
echo "Scaling down deployment $DEPLOYMENT_NAME..."
kubectl scale deployment "$DEPLOYMENT_NAME" --replicas=0
kubectl wait --for=delete pod -l app="$DEPLOYMENT_NAME" --timeout=120s

# Backup current PVC manifest
echo "Backing up PVC manifest..."
kubectl get pvc "$PVC_NAME" -o yaml > "pvc-backup-$(date +%s).yaml"

# Delete the old PVC
echo "Deleting corrupted PVC..."
kubectl delete pvc "$PVC_NAME" --wait=true

# Create new PVC from snapshot
echo "Creating new PVC from snapshot..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $PVC_NAME
spec:
  dataSource:
    name: $SNAPSHOT_NAME
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - $ACCESS_MODE
  resources:
    requests:
      storage: $RESTORE_SIZE
  storageClassName: $STORAGE_CLASS
EOF

# Wait for PVC to be bound
echo "Waiting for PVC to be bound..."
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/"$PVC_NAME" --timeout=600s

# Scale deployment back up
echo "Scaling deployment back up..."
kubectl scale deployment "$DEPLOYMENT_NAME" --replicas=1

# Wait for pod to be ready
echo "Waiting for pod to be ready..."
kubectl wait --for=condition=ready pod -l app="$DEPLOYMENT_NAME" --timeout=300s

echo "Recovery complete!"
kubectl get pods -l app="$DEPLOYMENT_NAME"
```

Make it executable and use it:

```bash
chmod +x restore-from-snapshot.sh
./restore-from-snapshot.sh mysql-snapshot-20260209 mysql mysql-pvc
```

## Restoring with Size Expansion

You can restore to a larger volume:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-expanded-pvc
spec:
  dataSource:
    name: mysql-snapshot-20260209
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      # Restore to 20Gi instead of original 10Gi
      storage: 20Gi
  storageClassName: standard
```

## Testing Restoration Process

Always test your restoration process regularly:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: snapshot-restore-test
spec:
  # Run weekly on Sundays at 3 AM
  schedule: "0 3 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-tester
          containers:
          - name: restore-test
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              # Find latest snapshot
              LATEST_SNAPSHOT=$(kubectl get volumesnapshot \
                -l app=mysql \
                --sort-by=.metadata.creationTimestamp \
                -o jsonpath='{.items[-1].metadata.name}')

              echo "Testing restore from: $LATEST_SNAPSHOT"

              # Create test namespace
              kubectl create namespace snapshot-test-$(date +%s) || true

              # Restore to test namespace
              cat <<EOF | kubectl apply -f -
              apiVersion: v1
              kind: PersistentVolumeClaim
              metadata:
                name: test-restore
                namespace: snapshot-test
              spec:
                dataSource:
                  name: $LATEST_SNAPSHOT
                  kind: VolumeSnapshot
                  apiGroup: snapshot.storage.k8s.io
                accessModes:
                  - ReadWriteOnce
                resources:
                  requests:
                    storage: 10Gi
                storageClassName: standard
              EOF

              # Wait for restoration
              kubectl wait -n snapshot-test \
                --for=jsonpath='{.status.phase}'=Bound \
                pvc/test-restore --timeout=600s

              echo "Restore test successful!"

              # Cleanup
              kubectl delete namespace snapshot-test
          restartPolicy: OnFailure
```

## Handling Restoration Failures

Monitor and troubleshoot restoration issues:

```bash
# Check PVC events for errors
kubectl describe pvc mysql-restored-pvc

# Common issues and solutions:

# 1. Snapshot not ready
# Solution: Wait for snapshot to complete
kubectl wait --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/mysql-snapshot-20260209 --timeout=600s

# 2. Insufficient storage quota
# Solution: Increase quota or clean up old resources
kubectl get resourcequota

# 3. Storage class mismatch
# Solution: Use the correct storage class that supports the CSI driver
kubectl get storageclass

# 4. CSI driver issues
# Solution: Check CSI driver pods
kubectl get pods -n kube-system | grep csi
kubectl logs -n kube-system <csi-pod-name>
```

VolumeSnapshot restoration provides a fast, efficient way to recover from data loss or corruption. By automating the restoration process and testing it regularly, you ensure your disaster recovery plan works when you need it most.

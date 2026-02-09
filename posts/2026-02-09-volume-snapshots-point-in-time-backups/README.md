# How to Use VolumeSnapshots to Create Point-in-Time Backups of Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Backup, VolumeSnapshot

Description: Learn how to create point-in-time backups of Kubernetes persistent volumes using VolumeSnapshots, enabling data protection and recovery capabilities for stateful workloads.

---

VolumeSnapshots in Kubernetes provide a standardized way to create point-in-time copies of persistent volumes. This feature is critical for backup strategies, disaster recovery, and data migration scenarios in production environments.

## Understanding VolumeSnapshots

A VolumeSnapshot is a Kubernetes resource that represents a snapshot of a persistent volume at a specific point in time. Unlike backups that copy data to external storage, snapshots typically leverage storage provider features to create efficient, space-saving copies.

VolumeSnapshots work through three main resources:

1. **VolumeSnapshot** - User-facing resource that requests a snapshot
2. **VolumeSnapshotContent** - Backend representation of the actual snapshot
3. **VolumeSnapshotClass** - Defines how snapshots should be created

The CSI driver for your storage backend handles the actual snapshot creation, which means snapshot support depends on your storage provider's capabilities.

## Prerequisites

Before using VolumeSnapshots, ensure your cluster meets these requirements:

```bash
# Check if snapshot CRDs are installed
kubectl get crd | grep snapshot

# You should see:
# volumesnapshotclasses.snapshot.storage.k8s.io
# volumesnapshotcontents.snapshot.storage.k8s.io
# volumesnapshots.snapshot.storage.k8s.io
```

If the CRDs are not installed, apply them:

```bash
# Install snapshot CRDs (v1 API)
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml

# Deploy the snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

## Creating a VolumeSnapshotClass

First, define a VolumeSnapshotClass that tells Kubernetes how to create snapshots:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-snapshot-class
driver: csi.example.com  # Replace with your CSI driver name
deletionPolicy: Delete   # Delete or Retain
parameters:
  # Driver-specific parameters
  # For AWS EBS CSI driver:
  # encrypted: "true"
  # For GCE PD CSI driver:
  # storage-locations: us-central1
```

For AWS EBS snapshots:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-snapshot-class
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  encrypted: "true"
```

For Google Cloud persistent disk snapshots:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: pd-snapshot-class
driver: pd.csi.storage.gke.io
deletionPolicy: Retain
parameters:
  storage-locations: us-central1
```

Apply the snapshot class:

```bash
kubectl apply -f volumesnapshotclass.yaml
```

## Creating Your First Volume Snapshot

Let's create a sample application with a persistent volume, then take a snapshot:

```yaml
# Create a PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
---
# Deploy MySQL to write some data
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: mysql
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
        - name: mysql-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-storage
        persistentVolumeClaim:
          claimName: mysql-pvc
```

Deploy the application:

```bash
kubectl apply -f mysql-deployment.yaml

# Wait for the pod to be ready
kubectl wait --for=condition=ready pod -l app=mysql --timeout=120s

# Create some test data
kubectl exec -it deploy/mysql -- mysql -uroot -ppassword123 -e "
CREATE DATABASE testdb;
USE testdb;
CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));
INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie');
"
```

Now create a snapshot of the persistent volume:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mysql-snapshot-20260209
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: mysql-pvc
```

Apply the snapshot:

```bash
kubectl apply -f volumesnapshot.yaml

# Check snapshot status
kubectl get volumesnapshot mysql-snapshot-20260209

# View detailed information
kubectl describe volumesnapshot mysql-snapshot-20260209
```

The output should show:

```
Name:         mysql-snapshot-20260209
Namespace:    default
Status:
  Bound Volume Snapshot Content Name:  snapcontent-xxxx
  Creation Time:                       2026-02-09T10:30:00Z
  Ready To Use:                        true
  Restore Size:                        10Gi
```

## Creating Automated Snapshot Schedules

For production environments, you need automated snapshot schedules. Create a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-snapshot-schedule
spec:
  # Run daily at 2 AM
  schedule: "0 2 * * *"
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
              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              cat <<EOF | kubectl apply -f -
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: mysql-snapshot-${TIMESTAMP}
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: mysql-pvc
              EOF
          restartPolicy: OnFailure
```

Create the required RBAC permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-creator
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: snapshot-creator-role
rules:
- apiGroups: ["snapshot.storage.k8s.io"]
  resources: ["volumesnapshots"]
  verbs: ["create", "get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: snapshot-creator-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: snapshot-creator-role
subjects:
- kind: ServiceAccount
  name: snapshot-creator
```

## Managing Snapshot Retention

To prevent unlimited snapshot growth, implement retention policies:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: snapshot-cleanup
spec:
  # Run daily at 3 AM
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Delete snapshots older than 7 days
              CUTOFF_DATE=$(date -d '7 days ago' +%s)

              kubectl get volumesnapshot -o json | jq -r '.items[] |
                select(.metadata.name | startswith("mysql-snapshot-")) |
                select(.status.creationTime != null) |
                select(((.status.creationTime | fromdateiso8601) < '$CUTOFF_DATE')) |
                .metadata.name' | while read snapshot; do
                  echo "Deleting old snapshot: $snapshot"
                  kubectl delete volumesnapshot "$snapshot"
              done
          restartPolicy: OnFailure
```

## Monitoring Snapshot Status

Create a monitoring script to check snapshot health:

```bash
#!/bin/bash
# check-snapshots.sh

# Get all snapshots
kubectl get volumesnapshot -o json | jq -r '.items[] |
  "\(.metadata.name)\t\(.status.readyToUse // "false")\t\(.status.creationTime // "pending")"' |
  column -t -s $'\t'

# Check for failed snapshots
FAILED=$(kubectl get volumesnapshot -o json | jq '[.items[] |
  select(.status.error != null)] | length')

if [ "$FAILED" -gt 0 ]; then
  echo "WARNING: $FAILED failed snapshots detected"
  kubectl get volumesnapshot -o json | jq -r '.items[] |
    select(.status.error != null) |
    "\(.metadata.name): \(.status.error.message)"'
fi
```

## Best Practices for Production Snapshots

Follow these practices for reliable backup strategies:

1. **Test restores regularly** - Snapshots are only useful if you can restore from them
2. **Use separate snapshot classes** for different workloads
3. **Tag snapshots** with metadata like application name and purpose
4. **Monitor snapshot creation** and set up alerts for failures
5. **Implement retention policies** to control costs
6. **Verify snapshot completion** before relying on them for recovery

Add labels to snapshots for better organization:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mysql-snapshot-20260209
  labels:
    app: mysql
    environment: production
    backup-type: scheduled
    retention-days: "7"
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: mysql-pvc
```

## Verifying Snapshot Integrity

Always verify your snapshots can be restored. Create a test namespace:

```bash
# Create test namespace
kubectl create namespace snapshot-test

# Restore from snapshot (covered in detail in next article)
kubectl apply -n snapshot-test -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-restored
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

# Verify data integrity
kubectl run -n snapshot-test mysql-verify --rm -it --restart=Never \
  --image=mysql:8.0 -- mysql -h mysql-service -uroot -ppassword123 \
  -e "USE testdb; SELECT * FROM users;"
```

VolumeSnapshots provide a powerful, storage-agnostic way to protect your Kubernetes data. By implementing automated snapshot schedules and retention policies, you ensure your stateful applications have reliable point-in-time backups for disaster recovery scenarios.

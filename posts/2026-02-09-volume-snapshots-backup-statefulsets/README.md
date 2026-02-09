# How to Implement Volume Snapshots for Backup and Restore of StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Backup

Description: Implement CSI volume snapshots for backing up and restoring StatefulSet data on Kubernetes, enabling point-in-time recovery and data protection for stateful applications.

---

Volume snapshots provide point-in-time copies of persistent volumes without disrupting running applications. For StatefulSets running databases, message queues, or other stateful workloads, snapshots offer a fast backup mechanism that captures consistent state for disaster recovery or pre-upgrade safety.

Unlike traditional backup tools that copy data file-by-file, CSI snapshots leverage storage backend capabilities to create instant copies using copy-on-write or similar techniques. This guide demonstrates implementing snapshot workflows for StatefulSets, automating backup schedules, and performing restore operations when needed.

## Understanding CSI Volume Snapshots

The Kubernetes volume snapshot feature consists of three main resources: VolumeSnapshotClass defines the snapshot driver and deletion policy, VolumeSnapshot represents a user request for a snapshot of a PVC, and VolumeSnapshotContent is the actual snapshot object created by the CSI driver.

When you create a VolumeSnapshot pointing to a PVC, the external-snapshotter sidecar calls the CSI driver's CreateSnapshot RPC. The driver creates a snapshot using the storage backend's native snapshot functionality and returns a snapshot handle. Kubernetes tracks this snapshot as a VolumeSnapshotContent object that can later be used to restore data or create new volumes.

Snapshots are crash-consistent by default, meaning they capture the volume state at a specific moment but may not represent application-consistent data. For databases, you typically want to flush buffers or perform a checkpoint before snapshotting to ensure consistency.

## Installing Volume Snapshot CRDs and Controller

Kubernetes requires separate CRDs and a snapshot controller for volume snapshot functionality.

```bash
# Install snapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml

# Verify CRDs
kubectl get crd | grep snapshot

# Deploy snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml

# Verify controller is running
kubectl get pods -n kube-system -l app=snapshot-controller
```

## Configuring VolumeSnapshotClass

Create a VolumeSnapshotClass for your CSI driver. This example uses Longhorn.

```yaml
# volumesnapshotclass.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: longhorn-snapshot-class
driver: driver.longhorn.io
deletionPolicy: Delete
parameters:
  # Optional: Driver-specific parameters
  type: snap
```

For production environments, consider using `deletionPolicy: Retain` to prevent accidental snapshot deletion.

```bash
kubectl apply -f volumesnapshotclass.yaml
kubectl get volumesnapshotclass
```

## Creating Snapshots of StatefulSet Volumes

Deploy a StatefulSet with a database to demonstrate snapshot workflows.

```yaml
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: longhorn
      resources:
        requests:
          storage: 50Gi
```

Deploy and populate with data.

```bash
kubectl apply -f postgres-statefulset.yaml
kubectl wait --for=condition=ready pod -l app=postgres

# Create test data
kubectl exec postgres-0 -- psql -U postgres -c "CREATE TABLE snapshot_test (id SERIAL PRIMARY KEY, data TEXT, created_at TIMESTAMP DEFAULT NOW());"
kubectl exec postgres-0 -- psql -U postgres -c "INSERT INTO snapshot_test (data) SELECT md5(random()::text) FROM generate_series(1, 10000);"
kubectl exec postgres-0 -- psql -U postgres -c "SELECT COUNT(*) FROM snapshot_test;"
```

Create a snapshot of the database volume.

```yaml
# postgres-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot-20260209
spec:
  volumeSnapshotClassName: longhorn-snapshot-class
  source:
    persistentVolumeClaimName: data-postgres-0
```

Apply and verify the snapshot.

```bash
kubectl apply -f postgres-snapshot.yaml

# Watch snapshot creation
kubectl get volumesnapshot postgres-snapshot-20260209 -w

# Check snapshot details
kubectl describe volumesnapshot postgres-snapshot-20260209

# Verify snapshot is ready
kubectl get volumesnapshot postgres-snapshot-20260209 -o jsonpath='{.status.readyToUse}'
```

## Implementing Application-Consistent Snapshots

For databases, perform a checkpoint or flush before snapshotting to ensure consistency.

```bash
# PostgreSQL: Perform checkpoint before snapshot
kubectl exec postgres-0 -- psql -U postgres -c "CHECKPOINT;"

# Create snapshot immediately after
kubectl apply -f postgres-snapshot.yaml

# MySQL: Flush tables
kubectl exec mysql-0 -- mysql -u root -p$MYSQL_ROOT_PASSWORD -e "FLUSH TABLES WITH READ LOCK; SYSTEM sleep 5; UNLOCK TABLES;" &
sleep 2
kubectl apply -f mysql-snapshot.yaml
```

For production workloads, automate this with pre-snapshot hooks using tools like Velero or custom operators.

## Restoring from Snapshots

Restore a snapshot to a new PVC for recovery testing or data analysis.

```yaml
# restored-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-restored-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  dataSource:
    name: postgres-snapshot-20260209
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 50Gi
```

Create a new pod using the restored PVC.

```yaml
# restored-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres-restored
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: changeme
    - name: PGDATA
      value: /var/lib/postgresql/data/pgdata
    ports:
    - containerPort: 5432
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-restored-pvc
```

Verify data was restored correctly.

```bash
kubectl apply -f restored-pvc.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/postgres-restored-pvc

kubectl apply -f restored-pod.yaml
kubectl wait --for=condition=ready pod/postgres-restored

# Check data
kubectl exec postgres-restored -- psql -U postgres -c "SELECT COUNT(*) FROM snapshot_test;"
kubectl exec postgres-restored -- psql -U postgres -c "SELECT * FROM snapshot_test LIMIT 5;"
```

## Automating Snapshot Schedules with CronJobs

Create snapshots on a schedule using Kubernetes CronJobs.

```yaml
# snapshot-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-snapshot-daily
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          containers:
          - name: snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              #!/bin/bash
              set -e

              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              PVC_NAME="data-postgres-0"
              SNAPSHOT_NAME="postgres-snapshot-${TIMESTAMP}"

              # Create snapshot manifest
              cat <<EOF | kubectl apply -f -
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: ${SNAPSHOT_NAME}
              spec:
                volumeSnapshotClassName: longhorn-snapshot-class
                source:
                  persistentVolumeClaimName: ${PVC_NAME}
              EOF

              # Wait for snapshot to be ready
              kubectl wait --for=jsonpath='{.status.readyToUse}'=true \
                volumesnapshot/${SNAPSHOT_NAME} --timeout=300s

              echo "Snapshot ${SNAPSHOT_NAME} created successfully"

              # Clean up snapshots older than 7 days
              kubectl get volumesnapshots -o json | \
                jq -r '.items[] |
                  select(.metadata.name | startswith("postgres-snapshot-")) |
                  select((now - (.metadata.creationTimestamp | fromdateiso8601)) > 604800) |
                  .metadata.name' | \
                xargs -r kubectl delete volumesnapshot
          restartPolicy: OnFailure
```

Create RBAC for the CronJob.

```yaml
# snapshot-creator-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: snapshot-creator
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: snapshot-creator
rules:
- apiGroups: ["snapshot.storage.k8s.io"]
  resources: ["volumesnapshots"]
  verbs: ["get", "list", "create", "delete"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: snapshot-creator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: snapshot-creator
subjects:
- kind: ServiceAccount
  name: snapshot-creator
```

Deploy the automated snapshot solution.

```bash
kubectl apply -f snapshot-creator-rbac.yaml
kubectl apply -f snapshot-cronjob.yaml

# Manually trigger a job to test
kubectl create job --from=cronjob/postgres-snapshot-daily manual-snapshot-test

# Check job logs
kubectl logs job/manual-snapshot-test
```

## Backing Up StatefulSet Snapshots to Object Storage

Export snapshots to S3 for off-cluster disaster recovery using Velero.

```bash
# Install Velero CLI
wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
tar -xvf velero-v1.12.0-linux-amd64.tar.gz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/

# Install Velero with snapshot support
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0,velero/velero-plugin-for-csi:v0.6.0 \
  --bucket velero-backups \
  --secret-file ./credentials-velero \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --features=EnableCSI \
  --use-node-agent

# Backup StatefulSet with snapshots
velero backup create postgres-backup-20260209 \
  --include-namespaces default \
  --selector app=postgres \
  --snapshot-volumes \
  --csi-snapshot-timeout=10m

# Wait for backup completion
velero backup describe postgres-backup-20260209
velero backup logs postgres-backup-20260209
```

Restore from Velero backup to a new namespace or cluster.

```bash
# Restore to different namespace
velero restore create postgres-restore \
  --from-backup postgres-backup-20260209 \
  --namespace-mappings default:postgres-restored

# Monitor restore
velero restore describe postgres-restore
velero restore logs postgres-restore

# Verify StatefulSet was restored
kubectl get statefulset -n postgres-restored
kubectl get pvc -n postgres-restored
kubectl get volumesnapshot -n postgres-restored
```

## Monitoring Snapshot Health

Track snapshot creation success and storage consumption.

```bash
# List all snapshots
kubectl get volumesnapshots -A

# Check snapshot size and status
kubectl get volumesnapshots -A -o custom-columns=\
NAME:.metadata.name,\
READY:.status.readyToUse,\
SIZE:.status.restoreSize,\
AGE:.metadata.creationTimestamp

# Find failed snapshots
kubectl get volumesnapshots -A -o json | \
  jq -r '.items[] |
    select(.status.readyToUse != true) |
    {name: .metadata.name, error: .status.error}'
```

Create alerts for snapshot failures.

```yaml
# prometheus-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: snapshot-alerts
spec:
  groups:
  - name: snapshots
    interval: 60s
    rules:
    - alert: SnapshotCreationFailed
      expr: |
        kube_volumesnapshot_status_ready_to_use{condition="false"} == 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Volume snapshot {{ $labels.volumesnapshot }} failed"
        description: "Snapshot {{ $labels.volumesnapshot }} in namespace {{ $labels.namespace }} is not ready"
```

Volume snapshots provide essential data protection for StatefulSets with minimal performance impact. By implementing automated snapshot schedules, testing restore procedures regularly, and integrating with backup solutions like Velero, you create a comprehensive disaster recovery strategy. The combination of fast snapshot creation and reliable restore capabilities ensures your stateful applications can recover quickly from data corruption, accidental deletion, or infrastructure failures.

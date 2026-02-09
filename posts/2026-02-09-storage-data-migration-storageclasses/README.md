# How to Implement Storage Data Migration Between StorageClasses on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Migration

Description: Learn strategies for migrating persistent volume data between different StorageClasses on Kubernetes without downtime, including tools and techniques for safe data transfer.

---

Migrating data between StorageClasses becomes necessary when moving from one storage backend to another, upgrading storage infrastructure, or optimizing performance characteristics. Unlike compute workloads that can be redeployed easily, stateful applications require careful data migration to prevent loss or corruption during the transition.

This guide covers multiple migration strategies ranging from simple rsync-based copies to sophisticated tools like Velero and custom migration controllers. You'll learn when to use each approach, how to validate data integrity, and how to minimize application downtime during the migration process.

## Understanding StorageClass Migration Challenges

Kubernetes volumes are bound to specific storage backends through StorageClasses. A PVC created with storage class A cannot simply change to storage class B because the underlying PV points to a specific storage implementation. Migrating requires creating new volumes on the target storage class and copying data from source to destination.

The main challenges include maintaining data consistency during migration, minimizing application downtime, handling large datasets efficiently, and validating that all data transferred correctly. Different workloads require different strategies based on their tolerance for downtime and data access patterns.

## Strategy 1: Offline Migration with rsync

The simplest approach involves scaling down the application, mounting both volumes in a migration pod, and copying data.

```yaml
# migration-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: storage-migrator
spec:
  containers:
  - name: migrator
    image: ubuntu:22.04
    command: ['sleep', 'infinity']
    volumeMounts:
    - name: source
      mountPath: /source
      readOnly: true
    - name: destination
      mountPath: /destination
  volumes:
  - name: source
    persistentVolumeClaim:
      claimName: old-storage-pvc
  - name: destination
    persistentVolumeClaim:
      claimName: new-storage-pvc
```

First, create a PVC on the new StorageClass.

```yaml
# new-storage-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: new-storage-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: new-storage-class
  resources:
    requests:
      storage: 100Gi
```

Execute the migration process.

```bash
# Scale down application to prevent writes
kubectl scale deployment myapp --replicas=0

# Create new PVC
kubectl apply -f new-storage-pvc.yaml
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/new-storage-pvc --timeout=60s

# Deploy migration pod
kubectl apply -f migration-pod.yaml
kubectl wait --for=condition=ready pod/storage-migrator --timeout=120s

# Perform data copy with rsync
kubectl exec storage-migrator -- apt-get update
kubectl exec storage-migrator -- apt-get install -y rsync

kubectl exec storage-migrator -- rsync -avhP --delete /source/ /destination/

# Verify data integrity with checksums
kubectl exec storage-migrator -- sh -c 'cd /source && find . -type f -exec sha256sum {} \; | sort > /tmp/source-checksums.txt'
kubectl exec storage-migrator -- sh -c 'cd /destination && find . -type f -exec sha256sum {} \; | sort > /tmp/dest-checksums.txt'
kubectl exec storage-migrator -- diff /tmp/source-checksums.txt /tmp/dest-checksums.txt

# Update application to use new PVC
kubectl set volume deployment/myapp --add=false --name=data --claim-name=new-storage-pvc

# Scale application back up
kubectl scale deployment myapp --replicas=3
```

This approach guarantees consistency but requires downtime proportional to data size.

## Strategy 2: Online Migration with Snapshots

For workloads supporting snapshots, you can minimize downtime by copying from a snapshot while the application continues running.

```yaml
# volumesnapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: pre-migration-snapshot
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: old-storage-pvc
```

Create the snapshot and restore it to the new storage class.

```bash
# Create snapshot while app runs
kubectl apply -f volumesnapshot.yaml
kubectl wait --for=jsonpath='{.status.readyToUse}'=true \
  volumesnapshot/pre-migration-snapshot --timeout=300s

# Restore snapshot to new storage class
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: new-storage-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: new-storage-class
  dataSource:
    name: pre-migration-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 100Gi
EOF

# Wait for restore to complete
kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/new-storage-pvc --timeout=600s

# Now perform incremental sync for changes since snapshot
kubectl scale deployment myapp --replicas=0
# Run rsync migration pod as shown in Strategy 1
kubectl scale deployment myapp --replicas=3
```

This reduces downtime to only the final incremental sync period.

## Strategy 3: Using Velero for Migration

Velero provides backup and restore functionality that works across storage classes.

```bash
# Install Velero CLI
wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
tar -xvf velero-v1.12.0-linux-amd64.tar.gz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/

# Install Velero server components
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket velero-backups \
  --secret-file ./credentials-velero \
  --use-volume-snapshots=true \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --use-node-agent
```

Backup the application and its volumes.

```bash
# Create backup including volumes
velero backup create myapp-migration \
  --include-namespaces default \
  --selector app=myapp \
  --snapshot-volumes

# Wait for backup to complete
velero backup describe myapp-migration
velero backup logs myapp-migration
```

Modify the backup to restore with a different storage class using a restore config.

```yaml
# restore-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: change-storage-class-config
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/change-storage-class: RestoreItemAction
data:
  old-storage-class: new-storage-class
```

Restore the backup with the new storage class.

```bash
# Apply storage class mapping
kubectl apply -f restore-config.yaml

# Perform restore
velero restore create myapp-migration-restore \
  --from-backup myapp-migration \
  --namespace-mappings default:default-migrated \
  --restore-volumes=true

# Monitor restore progress
velero restore describe myapp-migration-restore
velero restore logs myapp-migration-restore
```

## Strategy 4: Application-Level Replication

For databases and applications with built-in replication, use application features to migrate.

Example with PostgreSQL:

```yaml
# postgres-replica.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-replica
spec:
  serviceName: postgres-replica
  replicas: 1
  selector:
    matchLabels:
      app: postgres-replica
  template:
    metadata:
      labels:
        app: postgres-replica
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: changeme
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        # Configure as streaming replica
        - name: POSTGRES_MASTER_SERVICE_HOST
          value: postgres-primary
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
      storageClassName: new-storage-class
      resources:
        requests:
          storage: 100Gi
```

Configure PostgreSQL replication from old to new storage.

```bash
# On primary (old storage), create replication user and slot
kubectl exec postgres-primary-0 -- psql -U postgres -c \
  "CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replpass';"

kubectl exec postgres-primary-0 -- psql -U postgres -c \
  "SELECT * FROM pg_create_physical_replication_slot('replica_slot');"

# Configure pg_hba.conf to allow replication
kubectl exec postgres-primary-0 -- bash -c \
  "echo 'host replication replicator all md5' >> /var/lib/postgresql/data/pgdata/pg_hba.conf"

kubectl exec postgres-primary-0 -- psql -U postgres -c "SELECT pg_reload_conf();"

# Start replica pointing to new storage
kubectl apply -f postgres-replica.yaml

# Once replica catches up, promote it
kubectl exec postgres-replica-0 -- su - postgres -c "pg_ctl promote"

# Update application connections to new instance
kubectl patch service postgres -p '{"spec":{"selector":{"app":"postgres-replica"}}}'
```

## Strategy 5: Automated Migration with Tools

Use specialized migration tools like KubeVirt's CDI or custom operators.

Example with a custom migration job:

```yaml
# migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pvc-migrator
spec:
  template:
    spec:
      serviceAccountName: pvc-migrator
      containers:
      - name: migrator
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          #!/bin/bash
          set -e

          SOURCE_PVC="$1"
          TARGET_STORAGE_CLASS="$2"
          NAMESPACE="${3:-default}"

          # Get source PVC size
          SIZE=$(kubectl get pvc $SOURCE_PVC -n $NAMESPACE -o jsonpath='{.spec.resources.requests.storage}')

          # Create target PVC
          cat <<EOF | kubectl apply -f -
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: ${SOURCE_PVC}-migrated
            namespace: $NAMESPACE
          spec:
            accessModes:
              - ReadWriteOnce
            storageClassName: $TARGET_STORAGE_CLASS
            resources:
              requests:
                storage: $SIZE
          EOF

          # Wait for bound
          kubectl wait --for=jsonpath='{.status.phase}'=Bound \
            pvc/${SOURCE_PVC}-migrated -n $NAMESPACE --timeout=300s

          # Create migration pod
          cat <<EOF | kubectl apply -f -
          apiVersion: v1
          kind: Pod
          metadata:
            name: ${SOURCE_PVC}-migrate-pod
            namespace: $NAMESPACE
          spec:
            containers:
            - name: migrate
              image: ubuntu:22.04
              command: ['bash', '-c']
              args:
              - |
                apt-get update && apt-get install -y rsync
                rsync -avhP --delete /source/ /destination/
                echo "Migration complete"
              volumeMounts:
              - name: source
                mountPath: /source
              - name: destination
                mountPath: /destination
            volumes:
            - name: source
              persistentVolumeClaim:
                claimName: $SOURCE_PVC
            - name: destination
              persistentVolumeClaim:
                claimName: ${SOURCE_PVC}-migrated
          EOF

          # Wait for completion
          kubectl wait --for=condition=ready pod/${SOURCE_PVC}-migrate-pod \
            -n $NAMESPACE --timeout=120s
        env:
        - name: SOURCE_PVC
          value: "old-storage-pvc"
        - name: TARGET_STORAGE_CLASS
          value: "new-storage-class"
      restartPolicy: Never
  backoffLimit: 3
```

## Validating Migration Success

Always verify data integrity after migration.

```bash
# Compare directory structures
kubectl exec migration-pod -- diff -r /source /destination

# Compare file counts
kubectl exec migration-pod -- sh -c 'find /source -type f | wc -l'
kubectl exec migration-pod -- sh -c 'find /destination -type f | wc -l'

# Generate and compare checksums
kubectl exec migration-pod -- sh -c 'find /source -type f -exec sha256sum {} \; | sort > /tmp/source.txt'
kubectl exec migration-pod -- sh -c 'find /destination -type f -exec sha256sum {} \; | sort > /tmp/dest.txt'
kubectl exec migration-pod -- diff /tmp/source.txt /tmp/dest.txt

# Application-level validation
# For databases, compare row counts
kubectl exec postgres-0 -- psql -U postgres -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables;"
```

## Cleaning Up After Migration

Once validated, clean up old resources.

```bash
# Delete migration pods
kubectl delete pod storage-migrator

# Scale down applications using old storage
kubectl scale deployment myapp --replicas=0

# Delete old PVC (WARNING: This deletes data)
kubectl delete pvc old-storage-pvc

# Verify old PV was reclaimed according to policy
kubectl get pv | grep Released
```

Storage migration between StorageClasses requires careful planning and execution to maintain data integrity. The choice between offline migration, snapshot-based approaches, backup tools like Velero, or application-level replication depends on your downtime tolerance, data size, and infrastructure capabilities. Always test migrations in non-production environments first and maintain backups throughout the process.

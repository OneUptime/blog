# How to Set Up Longhorn for Database Workloads - For

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Database, PostgreSQL, MySQL, Performance

Description: Configure Longhorn storage optimally for database workloads including PostgreSQL, MySQL, and MongoDB with appropriate storage classes, performance settings, and backup configurations.

## Introduction

Running databases on Kubernetes with Longhorn storage requires careful configuration to ensure data integrity, optimal performance, and reliable backup/recovery. Databases have unique storage requirements - they need predictable low latency, high IOPS, durable writes, and consistent backup mechanisms. This guide covers the complete setup for running production databases on Longhorn.

## Key Requirements for Database Storage

| Requirement | Recommendation |
|------------|----------------|
| Durability | Synchronous replication with 3 replicas |
| Latency | Best-effort data locality for replicated volumes |
| Filesystem | Use a supported filesystem such as XFS |
| Backup | Automated recurring backups to external target |
| IOPS | NVMe disks with dedicated storage class |
| I/O Pattern | Random read/write - avoid HDD-backed storage |

## Step 1: Create a Database Storage Class

```yaml
# storageclass-database.yaml - Optimized storage class for databases

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-database
  annotations:
    # This is NOT the default class - databases should explicitly request it
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Retain   # Keep PVs when PVCs are deleted - prevents accidental data loss
volumeBindingMode: Immediate
parameters:
  # Three replicas for durability
  numberOfReplicas: "3"
  # Keep a local replica when possible for lower-latency reads
  dataLocality: "best-effort"
  # Use XFS for this storage class
  fsType: "xfs"
  # Keep failed replicas around longer before cleanup
  staleReplicaTimeout: "60"
  # Restrict replica placement to disks tagged "ssd"
  diskSelector: "ssd"
# Optimize mount options for databases
mountOptions:
  - noatime     # Don't update file access times
  - nodiratime  # Don't update directory access times
```

```bash
kubectl apply -f storageclass-database.yaml
```

## Step 2: Configure PostgreSQL with Longhorn

```yaml
# postgresql-statefulset.yaml - Production PostgreSQL on Longhorn
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: databases
spec:
  serviceName: postgresql
  replicas: 1   # Primary; use additional replicas for read replicas
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      # Run PostgreSQL on storage-optimized nodes if available
      nodeSelector:
        storage-type: ssd
      securityContext:
        fsGroup: 999    # postgres group
      containers:
        - name: postgresql
          image: postgres:15
          env:
            - name: POSTGRES_DB
              value: "appdb"
            - name: POSTGRES_USER
              value: "app"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgresql-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
            - name: POSTGRES_INITDB_WALDIR
              value: /var/lib/postgresql/wal
          args:
            # PostgreSQL configuration for Kubernetes storage
            - -c
            - shared_buffers=512MB
            - -c
            - effective_cache_size=1536MB
            - -c
            - maintenance_work_mem=128MB
            - -c
            - checkpoint_completion_target=0.9
            - -c
            - wal_buffers=16MB
            - -c
            - synchronous_commit=on    # Ensure WAL durability
          resources:
            requests:
              memory: "2Gi"
              cpu: "1"
            limits:
              memory: "4Gi"
              cpu: "4"
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
            - name: postgres-wal
              mountPath: /var/lib/postgresql/wal  # PostgreSQL uses this via POSTGRES_INITDB_WALDIR
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "app", "-d", "appdb"]
            initialDelaySeconds: 30
            periodSeconds: 10
      initContainers:
        - name: init-permissions
          image: busybox
          command: ["sh", "-c", "chown -R 999:999 /var/lib/postgresql/data /var/lib/postgresql/wal"]
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
            - name: postgres-wal
              mountPath: /var/lib/postgresql/wal
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: longhorn-database
        resources:
          requests:
            storage: 100Gi
    - metadata:
        name: postgres-wal
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: longhorn-database
        resources:
          requests:
            storage: 20Gi   # Separate volume for WAL files
```

```bash
kubectl create namespace databases

# Create PostgreSQL secret
kubectl create secret generic postgresql-secret \
  -n databases \
  --from-literal=password="$(openssl rand -base64 20)"

kubectl apply -f postgresql-statefulset.yaml
kubectl get pods -n databases -w
```

## Step 3: Configure MySQL with Longhorn

```yaml
# mysql-statefulset.yaml - MySQL on Longhorn
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: databases
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
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
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: root-password
            - name: MYSQL_DATABASE
              value: "appdb"
          args:
            # InnoDB configuration for SSD storage
            - --innodb-buffer-pool-size=1G
            - --innodb-log-file-size=256M
            - --innodb-flush-log-at-trx-commit=1   # Full ACID compliance
            - --sync-binlog=1                       # Binlog durability
            - --innodb-flush-method=O_DIRECT        # Bypass OS cache
          resources:
            requests:
              memory: "2Gi"
              cpu: "1"
            limits:
              memory: "4Gi"
              cpu: "4"
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
  volumeClaimTemplates:
    - metadata:
        name: mysql-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: longhorn-database
        resources:
          requests:
            storage: 50Gi
```

```bash
# Create MySQL secret
kubectl create secret generic mysql-secret \
  -n databases \
  --from-literal=root-password="$(openssl rand -base64 20)"

kubectl apply -f mysql-statefulset.yaml
kubectl get pods -n databases -w
```

## Step 4: Configure Automated Database Backups

```yaml
# recurring-db-backup.yaml - Frequent backups for database volumes
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: database-hourly-backup
  namespace: longhorn-system
spec:
  cron: "0 * * * *"      # Every hour
  task: "backup"
  retain: 48              # Keep 48 hourly backups (2 days)
  concurrency: 2
  labels:
    workload: database
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: database-snapshot-frequent
  namespace: longhorn-system
spec:
  cron: "*/15 * * * *"   # Every 15 minutes
  task: "snapshot"
  retain: 96              # Keep 96 snapshots (24 hours at 15-minute intervals)
  concurrency: 3
  labels:
    workload: database
```

```bash
# Longhorn backups require a configured backup target.
kubectl apply -f recurring-db-backup.yaml

# Apply recurring jobs to the database PVCs so Longhorn syncs the labels to the volumes
for pvc in postgres-data-postgresql-0 postgres-wal-postgresql-0 mysql-data-mysql-0; do
  kubectl label pvc "$pvc" \
    -n databases \
    recurring-job.longhorn.io/source=enabled \
    recurring-job.longhorn.io/database-hourly-backup=enabled \
    recurring-job.longhorn.io/database-snapshot-frequent=enabled \
    --overwrite
done
```

## Step 5: Volume Expansion for Growing Databases

```bash
# Expand a database PVC as it grows
kubectl patch pvc postgres-data-postgresql-0 \
  -n databases \
  -p '{"spec": {"resources": {"requests": {"storage": "200Gi"}}}}'

# Monitor expansion
kubectl get pvc postgres-data-postgresql-0 -n databases -w

# Verify PostgreSQL sees the new space
kubectl exec postgresql-0 -n databases -- df -h /var/lib/postgresql/data
```

## Conclusion

Running databases on Longhorn requires attention to storage class design, filesystem choice, replication settings, and backup frequency. The key principles are: use `Retain` reclaim policy to prevent accidental data loss, configure frequent snapshots and backups for low RPO, use a supported filesystem such as XFS, enable best-effort data locality for low-latency reads, and always test your recovery procedures. With these configurations in place, Longhorn provides a reliable and manageable storage platform for production database workloads.

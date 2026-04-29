# How to Set Up Longhorn for Database Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Database, PostgreSQL, MySQL, Kubernetes, Storage, StatefulSet, Performance

Description: Learn how to configure Longhorn storage for database workloads including StatefulSets for PostgreSQL and MySQL, with optimizations for data locality, IOPS, and backup scheduling.

---

Databases are the most demanding stateful workloads in Kubernetes. Running them on Longhorn requires careful configuration of replica count, data locality, backup schedules, and resource isolation to ensure durability and performance.

---

## Recommended Longhorn Settings for Databases

| Setting | Recommended Value | Reason |
|---|---|---|
| Number of replicas | 3 | High durability |
| Data locality | best-effort | Reduce read latency |
| Revision counter | disabled | Slightly better write IOPS |
| Snapshots | daily | Granular recovery points |
| Backups | every 6 hours | RPO of 6 hours |

---

## Step 1: Create a Database-Optimized StorageClass

```yaml
# storageclass-database.yaml

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-database
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"
  # Best-effort tries to place a replica on the same node as the DB pod
  dataLocality: "best-effort"
  # Disable revision counter to reduce write overhead
  disableRevisionCounter: "true"
  # Use disks tagged "ssd" for better IOPS
  diskSelector: "ssd"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

---

## Step 2: Deploy PostgreSQL as a StatefulSet

This example assumes the `databases` namespace, a headless `Service` named `postgres`, and the `postgres-secret` already exist.

```yaml
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
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
          image: postgres:16
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "4"
              memory: 8Gi
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: longhorn-database
        resources:
          requests:
            storage: 100Gi
```

---

## Step 3: Configure Recurring Backups

```yaml
# recurring-backup-db.yaml
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: db-backup-6h
  namespace: longhorn-system
spec:
  cron: "0 */6 * * *"
  task: backup
  groups:
    - database
  retain: 7
  concurrency: 1
  labels:
    workload: database
```

Label the Longhorn volume to add it to the `database` group:

```bash
kubectl -n longhorn-system label volume/<postgres-pvc-volume-name> \
  recurring-job-group.longhorn.io/database=enabled
```

---

## Step 4: Pre-Upgrade Snapshot Before Migrations

This assumes CSI snapshot support is enabled and a `VolumeSnapshotClass` named `longhorn-snapshot-vsc` already exists.

```bash
# Create a snapshot before running database migrations
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: pre-migration-$(date +%Y%m%d%H%M)
  namespace: databases
spec:
  volumeSnapshotClassName: longhorn-snapshot-vsc
  source:
    persistentVolumeClaimName: data-postgres-0
EOF
```

---

## Best Practices

- Use `reclaimPolicy: Retain` for database StorageClasses - never auto-delete database volumes.
- Set `volumeBindingMode: WaitForFirstConsumer` to delay provisioning until a pod is created so Kubernetes can consider scheduling constraints.
- Schedule database-specific backups more frequently than general workloads.
- Test backup restore on a staging database at least monthly to verify recovery capability.

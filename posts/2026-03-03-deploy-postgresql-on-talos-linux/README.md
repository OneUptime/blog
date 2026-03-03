# How to Deploy PostgreSQL on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, PostgreSQL, Kubernetes, Database, DevOps

Description: A complete guide to deploying PostgreSQL on Talos Linux using Kubernetes-native approaches with persistent storage and high availability.

---

PostgreSQL is one of the most trusted relational databases in the industry. If you are running Talos Linux as your Kubernetes operating system, deploying PostgreSQL requires a slightly different approach compared to traditional Linux distributions. Since Talos Linux is immutable and API-driven, you cannot SSH into nodes or install packages directly. Everything runs through Kubernetes workloads.

In this guide, we will walk through deploying PostgreSQL on a Talos Linux cluster step by step, covering storage configuration, deployment manifests, and best practices for production readiness.

## Why Talos Linux for PostgreSQL?

Talos Linux strips away everything unnecessary from a traditional OS. There is no shell, no SSH, no package manager. This makes the attack surface incredibly small, which is exactly what you want when running a database that holds critical data. The immutable nature of Talos means your nodes are consistent and reproducible, reducing configuration drift that can cause database issues down the line.

## Prerequisites

Before you begin, make sure you have:

- A running Talos Linux cluster with at least three nodes
- `kubectl` configured to communicate with your cluster
- `talosctl` installed for cluster management
- A storage solution configured (local-path-provisioner, Rook-Ceph, or Longhorn)

## Step 1: Configure Persistent Storage

PostgreSQL needs reliable persistent storage. On Talos Linux, you will typically use a CSI driver since you cannot use host-path storage in the traditional sense. Let us set up local-path-provisioner as a starting point.

```yaml
# local-path-provisioner-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-path-config
  namespace: local-path-storage
data:
  config.json: |-
    {
      "nodePathMap": [
        {
          "node": "DEFAULT_PATH_FOR_NON_LISTED_NODES",
          "paths": ["/var/local-path-provisioner"]
        }
      ]
    }
```

You need to make sure Talos Linux has the appropriate mount paths configured in its machine config:

```yaml
# talos-machine-patch.yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/local-path-provisioner
```

Apply this patch using talosctl:

```bash
# Apply the disk configuration to your worker nodes
talosctl apply-config --nodes 10.0.0.2 --file talos-machine-patch.yaml
```

## Step 2: Create a Namespace and Secrets

Keep your PostgreSQL deployment organized in its own namespace with proper secrets management.

```yaml
# postgres-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: postgres
---
# postgres-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
  namespace: postgres
type: Opaque
stringData:
  POSTGRES_USER: "appuser"
  POSTGRES_PASSWORD: "your-secure-password-here"
  POSTGRES_DB: "appdb"
```

```bash
# Apply the namespace and secrets
kubectl apply -f postgres-namespace.yaml
kubectl apply -f postgres-secret.yaml
```

## Step 3: Create a PersistentVolumeClaim

```yaml
# postgres-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: postgres
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 20Gi
```

```bash
# Create the persistent volume claim
kubectl apply -f postgres-pvc.yaml
```

## Step 4: Deploy PostgreSQL with a StatefulSet

For production workloads, a StatefulSet is the right choice over a Deployment because it provides stable network identities and persistent storage associations.

```yaml
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: postgres
spec:
  serviceName: postgresql
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
        - name: postgresql
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
              name: postgres
          envFrom:
            - secretRef:
                name: postgres-credentials
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
              subPath: pgdata
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          # Liveness probe to check if PostgreSQL is running
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - appuser
            initialDelaySeconds: 30
            periodSeconds: 10
          # Readiness probe to check if PostgreSQL is ready to accept connections
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - appuser
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 20Gi
```

## Step 5: Create a Service

```yaml
# postgres-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: postgres
spec:
  selector:
    app: postgresql
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP
```

```bash
# Deploy the StatefulSet and Service
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f postgres-service.yaml
```

## Step 6: Verify the Deployment

```bash
# Check if the pod is running
kubectl get pods -n postgres

# Check the logs to confirm PostgreSQL started correctly
kubectl logs postgresql-0 -n postgres

# Test the connection from within the cluster
kubectl run pg-client --rm -it --restart=Never \
  --image=postgres:16-alpine \
  --namespace=postgres \
  -- psql -h postgresql -U appuser -d appdb
```

## Configuring PostgreSQL for Production

Running PostgreSQL in production on Talos Linux requires a few additional considerations.

### Custom PostgreSQL Configuration

You can pass custom PostgreSQL configuration through a ConfigMap:

```yaml
# postgres-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: postgres
data:
  postgresql.conf: |
    max_connections = 200
    shared_buffers = 256MB
    effective_cache_size = 768MB
    work_mem = 4MB
    maintenance_work_mem = 128MB
    wal_level = replica
    max_wal_senders = 3
    synchronous_commit = on
    checkpoint_completion_target = 0.9
    log_min_duration_statement = 1000
```

Mount this ConfigMap in your StatefulSet by adding it to the volumes and volumeMounts sections.

### Backup Strategy

For backups, consider using tools like pgBackRest or WAL-G that work well in Kubernetes environments. You can run backup jobs as CronJobs in your cluster:

```yaml
# postgres-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: postgres
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16-alpine
              command:
                - /bin/sh
                - -c
                - pg_dump -h postgresql -U appuser appdb > /backups/backup-$(date +%Y%m%d).sql
              envFrom:
                - secretRef:
                    name: postgres-credentials
              volumeMounts:
                - name: backup-volume
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: postgres-backup-pvc
```

## High Availability with CloudNativePG

For true production high availability, consider using the CloudNativePG operator, which is purpose-built for running PostgreSQL on Kubernetes:

```bash
# Install CloudNativePG operator
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.0.yaml
```

```yaml
# postgres-cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-ha
  namespace: postgres
spec:
  instances: 3
  storage:
    size: 20Gi
    storageClass: local-path
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
  monitoring:
    enablePodMonitor: true
```

This gives you automatic failover, rolling updates, and built-in backup management.

## Monitoring PostgreSQL on Talos Linux

Deploy the Prometheus PostgreSQL exporter alongside your database to collect metrics:

```yaml
# postgres-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-exporter
  namespace: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-exporter
  template:
    metadata:
      labels:
        app: postgres-exporter
    spec:
      containers:
        - name: exporter
          image: prometheuscommunity/postgres-exporter:latest
          env:
            - name: DATA_SOURCE_NAME
              value: "postgresql://appuser:your-secure-password-here@postgresql:5432/appdb?sslmode=disable"
          ports:
            - containerPort: 9187
```

## Conclusion

Deploying PostgreSQL on Talos Linux is straightforward once you understand that everything must go through Kubernetes manifests. The immutable nature of Talos Linux actually works in your favor for database workloads because it eliminates the risk of someone accidentally modifying the host OS in ways that could affect your database. Combined with proper persistent storage, health checks, and backup strategies, you get a solid foundation for running PostgreSQL in production. For mission-critical workloads, using an operator like CloudNativePG will save you significant operational effort by handling failover, backups, and upgrades automatically.

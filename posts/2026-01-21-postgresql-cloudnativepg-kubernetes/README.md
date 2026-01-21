# How to Deploy PostgreSQL on Kubernetes with CloudNativePG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Kubernetes, CloudNativePG, Database, High Availability, Operator, Cloud Native

Description: A comprehensive guide to deploying PostgreSQL on Kubernetes using the CloudNativePG operator, covering installation, cluster configuration, high availability, backups, and production best practices.

---

CloudNativePG is a Kubernetes operator that manages the full lifecycle of PostgreSQL clusters. It covers everything from initial deployment to automated failover, backups, and updates. This guide walks you through deploying production-ready PostgreSQL clusters on Kubernetes.

## Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- Helm 3.x (for installation)
- Storage class available for persistent volumes

## Why CloudNativePG?

CloudNativePG offers several advantages:

- **Native Kubernetes Integration**: Uses CRDs and follows Kubernetes patterns
- **Automated Failover**: Promotes replicas automatically on primary failure
- **Continuous Backup**: Built-in support for WAL archiving to S3/GCS/Azure
- **Rolling Updates**: Zero-downtime PostgreSQL upgrades
- **Connection Pooling**: Integrated PgBouncer support
- **Monitoring**: Prometheus metrics out of the box

## Installing CloudNativePG Operator

### Using Helm

```bash
# Add the CloudNativePG Helm repository
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts
helm repo update

# Install the operator
helm install cnpg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace

# Verify installation
kubectl get pods -n cnpg-system
```

### Using kubectl

```bash
# Install latest version
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.0.yaml

# Verify the operator is running
kubectl get deployment -n cnpg-system cnpg-controller-manager
```

## Creating Your First PostgreSQL Cluster

### Basic Cluster

Create a file `postgres-cluster.yaml`:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
  namespace: default
spec:
  instances: 3

  postgresql:
    parameters:
      shared_buffers: "256MB"
      max_connections: "200"

  storage:
    size: 10Gi
    storageClass: standard  # Use your storage class

  bootstrap:
    initdb:
      database: myapp
      owner: myuser
```

Apply it:

```bash
kubectl apply -f postgres-cluster.yaml

# Watch the cluster creation
kubectl get cluster postgres-cluster -w

# Check pods
kubectl get pods -l cnpg.io/cluster=postgres-cluster
```

### Production-Ready Cluster

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-production
  namespace: production
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  postgresql:
    parameters:
      # Memory
      shared_buffers: "2GB"
      effective_cache_size: "6GB"
      work_mem: "64MB"
      maintenance_work_mem: "512MB"

      # Connections
      max_connections: "300"

      # WAL
      wal_level: "replica"
      max_wal_size: "2GB"
      min_wal_size: "512MB"

      # Checkpoints
      checkpoint_completion_target: "0.9"

      # Query planning
      random_page_cost: "1.1"
      effective_io_concurrency: "200"

      # Parallel queries
      max_parallel_workers_per_gather: "4"
      max_parallel_workers: "8"

      # Logging
      log_statement: "ddl"
      log_min_duration_statement: "1000"

    pg_hba:
      - host all all 10.0.0.0/8 scram-sha-256
      - host all all 172.16.0.0/12 scram-sha-256
      - host all all 192.168.0.0/16 scram-sha-256

  bootstrap:
    initdb:
      database: myapp
      owner: myuser
      secret:
        name: postgres-credentials
      postInitSQL:
        - CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
        - CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"

  storage:
    size: 100Gi
    storageClass: fast-ssd
    pvcTemplate:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 100Gi

  walStorage:
    size: 20Gi
    storageClass: fast-ssd

  resources:
    requests:
      memory: "4Gi"
      cpu: "2"
    limits:
      memory: "8Gi"
      cpu: "4"

  affinity:
    enablePodAntiAffinity: true
    topologyKey: kubernetes.io/hostname
    podAntiAffinityType: required

  monitoring:
    enablePodMonitor: true

  backup:
    barmanObjectStore:
      destinationPath: s3://my-bucket/postgres-backups
      s3Credentials:
        accessKeyId:
          name: s3-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-credentials
          key: SECRET_ACCESS_KEY
      wal:
        compression: gzip
        maxParallel: 4
      data:
        compression: gzip
    retentionPolicy: "30d"
```

Create the required secrets:

```bash
# Database credentials
kubectl create secret generic postgres-credentials \
  --from-literal=username=myuser \
  --from-literal=password=$(openssl rand -base64 24) \
  -n production

# S3 credentials for backups
kubectl create secret generic s3-credentials \
  --from-literal=ACCESS_KEY_ID=your-access-key \
  --from-literal=SECRET_ACCESS_KEY=your-secret-key \
  -n production
```

## Connecting to the Cluster

### Get Connection Details

```bash
# Get the service name
kubectl get services -l cnpg.io/cluster=postgres-cluster

# Get credentials
kubectl get secret postgres-cluster-app -o jsonpath='{.data.username}' | base64 -d
kubectl get secret postgres-cluster-app -o jsonpath='{.data.password}' | base64 -d
kubectl get secret postgres-cluster-app -o jsonpath='{.data.uri}' | base64 -d
```

### Service Types

CloudNativePG creates multiple services:

| Service | Purpose |
|---------|---------|
| `<cluster>-rw` | Read-write (primary) |
| `<cluster>-ro` | Read-only (replicas) |
| `<cluster>-r` | All instances (any) |

### Connect from Application

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-cluster-app
                  key: uri
            - name: DATABASE_HOST
              value: postgres-cluster-rw
            - name: DATABASE_PORT
              value: "5432"
            - name: DATABASE_NAME
              value: myapp
            - name: DATABASE_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-cluster-app
                  key: username
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-cluster-app
                  key: password
```

### Port Forward for Local Access

```bash
# Forward the primary
kubectl port-forward svc/postgres-cluster-rw 5432:5432

# Connect with psql
psql -h localhost -U myuser -d myapp
```

## Managing Users and Databases

### Create Additional Users

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
spec:
  # ... other config

  managed:
    roles:
      - name: readonly_user
        ensure: present
        login: true
        superuser: false
        createdb: false
        createrole: false
        inherit: true
        passwordSecret:
          name: readonly-user-credentials
        connectionLimit: 10

      - name: app_user
        ensure: present
        login: true
        superuser: false
        createdb: true
        passwordSecret:
          name: app-user-credentials
```

### Create Additional Databases

Run SQL commands via kubectl:

```bash
# Connect to primary
kubectl exec -it postgres-cluster-1 -- psql -U postgres

# Create database
CREATE DATABASE newdb OWNER myuser;
GRANT ALL PRIVILEGES ON DATABASE newdb TO myuser;
```

Or use bootstrap postInitSQL:

```yaml
bootstrap:
  initdb:
    database: myapp
    owner: myuser
    postInitApplicationSQL:
      - CREATE DATABASE analytics OWNER myuser
      - CREATE DATABASE reporting OWNER myuser
```

## Backup Configuration

### S3 Backup

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
spec:
  backup:
    barmanObjectStore:
      destinationPath: s3://bucket-name/postgres/
      endpointURL: https://s3.amazonaws.com
      s3Credentials:
        accessKeyId:
          name: aws-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: aws-credentials
          key: ACCESS_SECRET_KEY
        region:
          name: aws-credentials
          key: REGION
      wal:
        compression: gzip
        maxParallel: 4
      data:
        compression: gzip
        jobs: 2
    retentionPolicy: "30d"
```

### Google Cloud Storage Backup

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
spec:
  backup:
    barmanObjectStore:
      destinationPath: gs://bucket-name/postgres/
      googleCredentials:
        applicationCredentials:
          name: gcs-credentials
          key: gcsCredentials
      wal:
        compression: gzip
      data:
        compression: gzip
    retentionPolicy: "30d"
```

### Azure Blob Storage Backup

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
spec:
  backup:
    barmanObjectStore:
      destinationPath: https://account.blob.core.windows.net/container/postgres/
      azureCredentials:
        storageAccount:
          name: azure-credentials
          key: STORAGE_ACCOUNT
        storageKey:
          name: azure-credentials
          key: STORAGE_KEY
      wal:
        compression: gzip
      data:
        compression: gzip
    retentionPolicy: "30d"
```

### Scheduled Backups

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: postgres-backup-schedule
spec:
  schedule: "0 0 * * *"  # Daily at midnight
  backupOwnerReference: self
  cluster:
    name: postgres-cluster
  immediate: false
```

### On-Demand Backup

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: postgres-backup-manual
spec:
  cluster:
    name: postgres-cluster
```

Apply and check status:

```bash
kubectl apply -f backup.yaml
kubectl get backup postgres-backup-manual -w
```

## Point-in-Time Recovery

### Restore to Specific Time

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-restored
spec:
  instances: 3

  storage:
    size: 100Gi
    storageClass: fast-ssd

  bootstrap:
    recovery:
      source: postgres-cluster
      recoveryTarget:
        targetTime: "2026-01-20T15:30:00Z"

  externalClusters:
    - name: postgres-cluster
      barmanObjectStore:
        destinationPath: s3://bucket-name/postgres/
        s3Credentials:
          accessKeyId:
            name: aws-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: aws-credentials
            key: ACCESS_SECRET_KEY
        wal:
          maxParallel: 4
```

### Restore from Backup Object

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-restored
spec:
  instances: 3

  storage:
    size: 100Gi

  bootstrap:
    recovery:
      backup:
        name: postgres-backup-manual
```

## Monitoring with Prometheus

### Enable Monitoring

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
spec:
  monitoring:
    enablePodMonitor: true
    customQueriesConfigMap:
      - name: postgres-custom-queries
        key: queries
```

### Custom Queries ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-custom-queries
data:
  queries: |
    pg_database_size:
      query: "SELECT datname, pg_database_size(datname) as size FROM pg_database WHERE datname NOT IN ('template0', 'template1')"
      metrics:
        - datname:
            usage: "LABEL"
            description: "Database name"
        - size:
            usage: "GAUGE"
            description: "Database size in bytes"

    pg_stat_user_tables:
      query: "SELECT schemaname, relname, seq_scan, idx_scan, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables"
      metrics:
        - schemaname:
            usage: "LABEL"
        - relname:
            usage: "LABEL"
        - seq_scan:
            usage: "COUNTER"
        - idx_scan:
            usage: "COUNTER"
        - n_tup_ins:
            usage: "COUNTER"
        - n_tup_upd:
            usage: "COUNTER"
        - n_tup_del:
            usage: "COUNTER"
```

### ServiceMonitor for Prometheus Operator

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgres-cluster
spec:
  selector:
    matchLabels:
      cnpg.io/cluster: postgres-cluster
  endpoints:
    - port: metrics
      interval: 30s
```

## Scaling

### Scale Replicas

```bash
# Scale up
kubectl patch cluster postgres-cluster --type merge -p '{"spec":{"instances":5}}'

# Scale down
kubectl patch cluster postgres-cluster --type merge -p '{"spec":{"instances":3}}'
```

### Vertical Scaling

```bash
kubectl patch cluster postgres-cluster --type merge -p '{
  "spec": {
    "resources": {
      "requests": {"memory": "8Gi", "cpu": "4"},
      "limits": {"memory": "16Gi", "cpu": "8"}
    }
  }
}'
```

## Maintenance Operations

### Switchover

Manually promote a replica to primary:

```bash
# Trigger switchover to specific instance
kubectl cnpg promote postgres-cluster postgres-cluster-2

# Or using annotation
kubectl annotate cluster postgres-cluster cnpg.io/targetPrimary=postgres-cluster-2
```

### Rolling Restart

```bash
kubectl cnpg restart postgres-cluster
```

### PostgreSQL Version Upgrade

```yaml
spec:
  imageName: ghcr.io/cloudnative-pg/postgresql:16.2  # Update version
```

Apply and watch the rolling update:

```bash
kubectl apply -f postgres-cluster.yaml
kubectl get pods -l cnpg.io/cluster=postgres-cluster -w
```

## Connection Pooling with PgBouncer

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
spec:
  instances: 3

  # ... other config

  pooler:
    instances: 2
    type: rw  # or "ro" for read replicas
    pgbouncer:
      poolMode: transaction
      parameters:
        max_client_conn: "1000"
        default_pool_size: "25"
        min_pool_size: "10"
        reserve_pool_size: "5"
```

This creates a separate PgBouncer deployment:

```bash
kubectl get pods -l cnpg.io/poolerName=postgres-cluster-pooler-rw
```

## Troubleshooting

### Check Cluster Status

```bash
# Overall status
kubectl get cluster postgres-cluster

# Detailed status
kubectl describe cluster postgres-cluster

# Check events
kubectl get events --field-selector involvedObject.name=postgres-cluster
```

### View Logs

```bash
# Primary logs
kubectl logs postgres-cluster-1

# Follow logs
kubectl logs -f postgres-cluster-1

# All pods
kubectl logs -l cnpg.io/cluster=postgres-cluster --all-containers
```

### Common Issues

**Cluster stuck in "Setting up primary"**
```bash
# Check PVC status
kubectl get pvc -l cnpg.io/cluster=postgres-cluster

# Check storage class
kubectl get storageclass
```

**Replication lag**
```bash
# Check replication status
kubectl exec postgres-cluster-1 -- psql -c "SELECT * FROM pg_stat_replication;"
```

**Failover not working**
```bash
# Check pod anti-affinity
kubectl get pods -l cnpg.io/cluster=postgres-cluster -o wide

# Verify instances are on different nodes
```

## Conclusion

CloudNativePG provides a robust, production-ready way to run PostgreSQL on Kubernetes. Key takeaways:

1. Use at least 3 instances for high availability
2. Configure proper resource requests and limits
3. Enable automated backups to object storage
4. Use pod anti-affinity for true HA
5. Enable monitoring with Prometheus
6. Consider PgBouncer for connection pooling

With proper configuration, CloudNativePG handles automated failover, continuous backups, and rolling updates - letting you focus on your application rather than database operations.

# How to Deploy PostgreSQL on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, PostgreSQL, Database, Helm

Description: Deploy a production-ready PostgreSQL database on Rancher with high availability using the Bitnami chart or the CloudNativePG operator for cloud-native management.

## Introduction

PostgreSQL is a powerful, enterprise-grade open-source relational database. This guide covers two approaches for deploying PostgreSQL on Rancher: the Bitnami Helm chart for a quick start, and the CloudNativePG operator for a fully Kubernetes-native, highly available deployment.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- A StorageClass for persistent volumes
- kubectl with namespace admin access
- cert-manager installed in the cluster

## Method 1: Bitnami PostgreSQL Helm Chart

### Create Configuration

```yaml
# postgresql-values.yaml - Production PostgreSQL configuration

architecture: replication

auth:
  postgresPassword: "SecureP0stgresP@ss"
  username: "appuser"
  password: "AppUserP@ss"
  database: "myapp"

primary:
  persistence:
    enabled: true
    storageClass: "standard"
    size: 30Gi
  resources:
    requests:
      memory: 512Mi
      cpu: 250m
    limits:
      memory: 2Gi
      cpu: 2000m
  configuration: |
    max_connections = 200
    shared_buffers = 512MB
    effective_cache_size = 1536MB
    maintenance_work_mem = 128MB
    checkpoint_completion_target = 0.9
    wal_buffers = 16MB
    default_statistics_target = 100
    random_page_cost = 1.1
    effective_io_concurrency = 200
    min_wal_size = 1GB
    max_wal_size = 4GB
    log_min_duration_statement = 1000

readReplicas:
  replicaCount: 2
  persistence:
    enabled: true
    storageClass: "standard"
    size: 30Gi

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
```

```bash
# Deploy PostgreSQL
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgresql bitnami/postgresql \
  --namespace databases \
  --create-namespace \
  --values postgresql-values.yaml \
  --wait

# Connect to PostgreSQL
kubectl exec -n databases -it postgresql-primary-0 -- \
  psql -U postgres
```

## Method 2: CloudNativePG Operator (Recommended for Production)

### Install CloudNativePG Operator

```bash
# Install the CloudNativePG operator
helm repo add cnpg https://cloudnative-pg.github.io/charts
helm install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace \
  --wait

# Install the Barman Cloud Plugin for backups
kubectl apply -f \
  https://github.com/cloudnative-pg/plugin-barman-cloud/releases/download/v0.12.0/manifest.yaml

# Verify operator and backup plugin are running
kubectl rollout status deployment -n cnpg-system cnpg-cloudnative-pg
kubectl rollout status deployment -n cnpg-system barman-cloud
```

### Deploy a PostgreSQL Cluster

```yaml
# postgresql-cluster.yaml - Barman ObjectStore and CloudNativePG cluster definition
apiVersion: barmancloud.cnpg.io/v1
kind: ObjectStore
metadata:
  name: postgres-prod-backup
  namespace: databases
spec:
  configuration:
    destinationPath: s3://my-postgres-backups/prod
    s3Credentials:
      accessKeyId:
        name: s3-credentials
        key: ACCESS_KEY_ID
      secretAccessKey:
        name: s3-credentials
        key: ACCESS_SECRET_KEY
    wal:
      compression: gzip
  retentionPolicy: "30d"
---
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-prod
  namespace: databases
spec:
  # PostgreSQL version
  imageName: ghcr.io/cloudnative-pg/postgresql:16

  # 3 instances: 1 primary + 2 replicas
  instances: 3

  # Start in recovery mode from a backup
  # bootstrap:
  #   recovery:
  #     source: clusterBackup

  storage:
    size: 30Gi
    storageClass: standard

  resources:
    requests:
      memory: 512Mi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 2000m

  # PostgreSQL configuration
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "512MB"
      effective_cache_size: "1536MB"
      maintenance_work_mem: "128MB"
      wal_level: logical
      archive_mode: "on"

  # Backup configuration
  plugins:
    - name: barman-cloud.cloudnative-pg.io
      isWALArchiver: true
      parameters:
        barmanObjectName: postgres-prod-backup

  # Bootstrap with a new cluster
  bootstrap:
    initdb:
      database: myapp
      owner: appuser
      secret:
        name: app-db-secret
```

### Create Application Secret

```bash
# Create the database namespace
kubectl create namespace databases --dry-run=client -o yaml | kubectl apply -f -

# Create the application user secret
kubectl create secret generic app-db-secret \
  --from-literal=username=appuser \
  --from-literal=password=SecureAppP@ss \
  --namespace=databases

# Create S3 credentials for backups
kubectl create secret generic s3-credentials \
  --from-literal=ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
  --from-literal=ACCESS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --namespace=databases

# Apply the cluster
kubectl apply -f postgresql-cluster.yaml

# Watch cluster progress
kubectl get cluster postgres-prod -n databases -w
```

## Step 3: Verify PostgreSQL Deployment

```bash
# Check cluster status
kubectl get cluster postgres-prod -n databases

# Connect to the primary
kubectl exec -n databases postgres-prod-1 -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"

# Check replication
kubectl exec -n databases postgres-prod-1 -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

## Step 4: Configure Scheduled Backups

```yaml
# scheduled-backup.yaml - CloudNativePG scheduled backup
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: postgres-daily-backup
  namespace: databases
spec:
  # Run at 2 AM daily
  schedule: "0 0 2 * * *"
  backupOwnerReference: self
  cluster:
    name: postgres-prod
  method: plugin
  pluginConfiguration:
    name: barman-cloud.cloudnative-pg.io
  immediate: true  # Run immediately on creation
```

## Step 5: Connect Applications

```yaml
# app-deployment.yaml - Application connecting to PostgreSQL
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: databases
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-app:v1.0
          env:
            - name: DB_HOST
              # CloudNativePG creates a read-write service
              value: postgres-prod-rw.databases.svc.cluster.local
            - name: DB_READONLY_HOST
              # Read-only service for SELECT queries
              value: postgres-prod-ro.databases.svc.cluster.local
            - name: DB_PORT
              value: "5432"
            - name: DB_NAME
              value: myapp
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: app-db-secret
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-db-secret
                  key: password
```

## Step 6: Configure PgBouncer for Connection Pooling

```yaml
# pgbouncer-pooler.yaml - CloudNativePG connection pooler
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: postgres-pooler
  namespace: databases
spec:
  cluster:
    name: postgres-prod
  instances: 3
  type: rw  # Read-write pooler
  pgbouncer:
    poolMode: transaction  # Transaction-level pooling
    parameters:
      max_client_conn: "1000"
      default_pool_size: "25"
```

## Troubleshooting

```bash
# Check CloudNativePG operator logs
kubectl logs -n cnpg-system deployment/cnpg-cloudnative-pg --tail=100

# View cluster events
kubectl describe cluster postgres-prod -n databases | tail -30

# Check pod logs
kubectl logs -n databases postgres-prod-1 --tail=50

# Perform a manual failover
kubectl cnpg promote -n databases postgres-prod postgres-prod-2
```

## Conclusion

PostgreSQL on Rancher can be deployed using either the Bitnami chart for a quick start or the CloudNativePG operator for a production-grade, cloud-native deployment. CloudNativePG is strongly recommended for production as it provides proper high availability, automated failover, point-in-time recovery, and native Kubernetes integration. Combined with Rancher's monitoring stack, you get full visibility into your PostgreSQL cluster health and performance.

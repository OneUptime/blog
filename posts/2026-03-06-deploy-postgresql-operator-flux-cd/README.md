# How to Deploy PostgreSQL Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, PostgreSQL, Kubernetes, Database, GitOps, cloudnative-pg, Operator, Postgres

Description: A practical guide to deploying the CloudNativePG PostgreSQL operator on Kubernetes using Flux CD for GitOps-managed database infrastructure.

---

## Introduction

PostgreSQL is the most popular open-source relational database, and running it on Kubernetes requires careful orchestration. CloudNativePG (CNPG) is a Kubernetes operator that covers the full lifecycle of a highly available PostgreSQL database cluster with a primary/standby architecture, using native streaming replication.

This guide demonstrates how to deploy CloudNativePG with Flux CD, configure PostgreSQL clusters, set up automated backups, and manage database operations through GitOps.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on your cluster
- A storage class available for persistent volumes
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Repository Structure

```text
clusters/
  my-cluster/
    databases/
      postgresql/
        namespace.yaml
        helmrepository.yaml
        helmrelease.yaml
        cluster.yaml
        scheduled-backup.yaml
        kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/databases/postgresql/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: postgresql
  labels:
    app.kubernetes.io/name: cloudnative-pg
    app.kubernetes.io/part-of: database
```

## Step 2: Add the CloudNativePG Helm Repository

```yaml
# clusters/my-cluster/databases/postgresql/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cloudnative-pg
  namespace: postgresql
spec:
  interval: 1h
  # Official CloudNativePG Helm chart repository
  url: https://cloudnative-pg.github.io/charts
```

## Step 3: Deploy the CloudNativePG Operator

```yaml
# clusters/my-cluster/databases/postgresql/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cloudnative-pg
  namespace: postgresql
spec:
  interval: 30m
  chart:
    spec:
      chart: cloudnative-pg
      version: "0.21.x"
      sourceRef:
        kind: HelmRepository
        name: cloudnative-pg
        namespace: postgresql
  timeout: 10m
  values:
    # Resource configuration for the operator
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Enable monitoring with Prometheus
    monitoring:
      podMonitorEnabled: true
      grafanaDashboard:
        create: true
    # Configuration for webhook certificates
    webhook:
      mutating:
        create: true
      validating:
        create: true
```

## Step 4: Create Database Credentials

Store database credentials in a Kubernetes Secret.

```yaml
# clusters/my-cluster/databases/postgresql/credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: pg-app-credentials
  namespace: postgresql
type: kubernetes.io/basic-auth
stringData:
  # Application database user credentials
  username: app_user
  password: "change-me-to-a-strong-password"
---
apiVersion: v1
kind: Secret
metadata:
  name: pg-superuser-credentials
  namespace: postgresql
type: kubernetes.io/basic-auth
stringData:
  # Superuser credentials for administrative tasks
  username: postgres
  password: "change-me-to-a-strong-superuser-password"
```

## Step 5: Deploy a PostgreSQL Cluster

```yaml
# clusters/my-cluster/databases/postgresql/cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: pg-cluster
  namespace: postgresql
spec:
  # Number of instances (1 primary + 2 standby replicas)
  instances: 3
  # PostgreSQL version
  imageName: ghcr.io/cloudnative-pg/postgresql:16.2

  # PostgreSQL configuration
  postgresql:
    parameters:
      # Memory configuration
      shared_buffers: "256MB"
      effective_cache_size: "768MB"
      work_mem: "16MB"
      maintenance_work_mem: "128MB"
      # WAL configuration
      wal_buffers: "16MB"
      max_wal_size: "1GB"
      min_wal_size: "512MB"
      # Connection settings
      max_connections: "200"
      # Logging
      log_statement: "ddl"
      log_min_duration_statement: "1000"
    # Enable pg_stat_statements extension
    pg_hba:
      - host all all 10.0.0.0/8 md5
      - host all all 172.16.0.0/12 md5

  # Bootstrap configuration for initial setup
  bootstrap:
    initdb:
      database: appdb
      owner: app_user
      secret:
        name: pg-app-credentials
      # Post-initialization SQL
      postInitSQL:
        - CREATE EXTENSION IF NOT EXISTS pg_stat_statements
        - CREATE EXTENSION IF NOT EXISTS pgcrypto

  # Superuser credentials
  superuserSecret:
    name: pg-superuser-credentials

  # Storage configuration
  storage:
    size: 20Gi
    storageClass: standard
    # PVC resize policy
    pvcTemplate:
      accessModes:
        - ReadWriteOnce

  # WAL storage on a separate volume for performance
  walStorage:
    size: 5Gi
    storageClass: standard

  # Resource limits for PostgreSQL pods
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: "2"
      memory: 2Gi

  # Affinity rules to spread replicas across nodes
  affinity:
    topologyKey: kubernetes.io/hostname
    podAntiAffinityType: required

  # Monitoring configuration
  monitoring:
    enablePodMonitor: true
    customQueriesConfigMap:
      - name: pg-custom-queries
        key: queries

  # Backup configuration using object storage
  backup:
    barmanObjectStore:
      destinationPath: "s3://pg-backups/pg-cluster/"
      endpointURL: "https://s3.amazonaws.com"
      s3Credentials:
        accessKeyId:
          name: pg-s3-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: pg-s3-credentials
          key: ACCESS_SECRET_KEY
      wal:
        compression: gzip
        maxParallel: 2
      data:
        compression: gzip
    retentionPolicy: "30d"
```

## Step 6: Configure Scheduled Backups

```yaml
# clusters/my-cluster/databases/postgresql/scheduled-backup.yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: pg-cluster-daily-backup
  namespace: postgresql
spec:
  # Run daily at 2 AM UTC
  schedule: "0 2 * * *"
  # Reference to the PostgreSQL cluster
  cluster:
    name: pg-cluster
  # Backup type: full database backup
  backupOwnerReference: self
  # Immediate backup on creation
  immediate: false
  # Suspend the schedule if needed
  suspend: false
```

## Step 7: Create Custom Monitoring Queries

```yaml
# clusters/my-cluster/databases/postgresql/monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pg-custom-queries
  namespace: postgresql
data:
  queries: |
    # Monitor database size
    pg_database_size:
      query: "SELECT datname, pg_database_size(datname) as size_bytes FROM pg_database WHERE datname NOT IN ('template0', 'template1')"
      metrics:
        - datname:
            usage: "LABEL"
            description: "Database name"
        - size_bytes:
            usage: "GAUGE"
            description: "Database size in bytes"
    # Monitor active connections
    pg_stat_activity_count:
      query: "SELECT state, count(*) as count FROM pg_stat_activity GROUP BY state"
      metrics:
        - state:
            usage: "LABEL"
            description: "Connection state"
        - count:
            usage: "GAUGE"
            description: "Number of connections"
    # Monitor replication lag
    pg_replication_lag:
      query: "SELECT CASE WHEN pg_is_in_recovery() THEN EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) ELSE 0 END AS lag_seconds"
      metrics:
        - lag_seconds:
            usage: "GAUGE"
            description: "Replication lag in seconds"
```

## Step 8: Configure Connection Pooling

```yaml
# clusters/my-cluster/databases/postgresql/pooler.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: pg-cluster-pooler-rw
  namespace: postgresql
spec:
  # Reference to the PostgreSQL cluster
  cluster:
    name: pg-cluster
  # Number of PgBouncer instances
  instances: 2
  # Read-write connections go to the primary
  type: rw
  pgbouncer:
    # Connection pooling mode
    poolMode: transaction
    parameters:
      max_client_conn: "1000"
      default_pool_size: "25"
      min_pool_size: "5"
      reserve_pool_size: "5"
---
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: pg-cluster-pooler-ro
  namespace: postgresql
spec:
  cluster:
    name: pg-cluster
  instances: 2
  # Read-only connections go to standby replicas
  type: ro
  pgbouncer:
    poolMode: transaction
    parameters:
      max_client_conn: "1000"
      default_pool_size: "25"
```

## Step 9: Create the Kustomization

```yaml
# clusters/my-cluster/databases/postgresql/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
  - credentials.yaml
  - monitoring.yaml
  - cluster.yaml
  - scheduled-backup.yaml
  - pooler.yaml
```

## Step 10: Create the Flux Kustomization

```yaml
# clusters/my-cluster/databases/postgresql-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: postgresql
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/databases/postgresql
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: cloudnative-pg
      namespace: postgresql
  timeout: 20m
```

## Verify the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations postgresql

# Verify the operator
kubectl get pods -n postgresql -l app.kubernetes.io/name=cloudnative-pg

# Check PostgreSQL cluster status
kubectl get cluster -n postgresql

# View cluster details
kubectl describe cluster pg-cluster -n postgresql

# Check PostgreSQL pod status
kubectl get pods -n postgresql -l cnpg.io/cluster=pg-cluster

# Connect to the primary instance
kubectl exec -it pg-cluster-1 -n postgresql -- psql -U postgres -d appdb

# Check replication status
kubectl exec -it pg-cluster-1 -n postgresql -- psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

## Troubleshooting

1. **Cluster not becoming healthy**: Check the operator logs with `kubectl logs -n postgresql -l app.kubernetes.io/name=cloudnative-pg`.

2. **Replication lag too high**: Verify network connectivity between pods and check WAL archiving status.

3. **Backup failures**: Ensure S3 credentials are correct and the bucket exists with proper permissions.

## Conclusion

You have successfully deployed a production-ready PostgreSQL cluster on Kubernetes using CloudNativePG and Flux CD. The setup includes high availability with streaming replication, automated backups, connection pooling, and monitoring -- all managed through GitOps principles.

# How to Deploy CloudNativePG PostgreSQL Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, PostgreSQL, CloudNativePG, Database Operators

Description: Deploy the CloudNativePG operator for production PostgreSQL clusters on Kubernetes using Flux CD HelmRelease.

---

## Introduction

CloudNativePG (CNPG) is a Kubernetes operator that manages PostgreSQL clusters natively, without relying on external tools like Patroni or Consul for high availability. It implements PostgreSQL streaming replication entirely within Kubernetes using leader election, automated failover, and rolling updates. CNPG is backed by EDB and has become one of the most actively maintained PostgreSQL operators in the cloud-native ecosystem.

Deploying CNPG through Flux CD gives you GitOps control over the operator itself and over every PostgreSQL cluster it manages. Cluster topology changes — adding a replica, changing PostgreSQL version, adjusting connection limits — are Git commits reviewed by your team and applied automatically.

This post covers deploying the CNPG operator via Flux HelmRelease and creating a production-ready PostgreSQL cluster using the `Cluster` CRD.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed
- An S3-compatible object store for backups (optional but recommended)

## Step 1: Add the CloudNativePG HelmRepository

```yaml
# infrastructure/sources/cnpg-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cnpg
  namespace: flux-system
spec:
  interval: 12h
  url: https://cloudnative-pg.github.io/charts
```

## Step 2: Deploy the CNPG Operator

```yaml
# infrastructure/databases/cnpg/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cloudnative-pg
  namespace: cnpg-system
spec:
  interval: 30m
  chart:
    spec:
      chart: cloudnative-pg
      version: "0.21.6"
      sourceRef:
        kind: HelmRepository
        name: cnpg
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    replicaCount: 1
    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    # Enable Prometheus metrics
    monitoring:
      podMonitorEnabled: true
      grafanaDashboard:
        create: true
        namespace: monitoring
```

```yaml
# infrastructure/databases/cnpg/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cnpg-system
```

## Step 3: Create a PostgreSQL Cluster

With the operator installed, create your first PostgreSQL cluster using the `Cluster` CRD:

```yaml
# infrastructure/databases/cnpg/postgres-cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-primary
  namespace: databases
spec:
  # Number of instances (1 primary + N replicas)
  instances: 3

  # PostgreSQL version
  imageName: ghcr.io/cloudnative-pg/postgresql:16.3

  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "768MB"
      work_mem: "4MB"
      maintenance_work_mem: "64MB"
      # Enable logical replication for CDC
      wal_level: logical

  # Bootstrap: initialize from scratch
  bootstrap:
    initdb:
      database: app
      owner: app
      secret:
        name: postgres-app-credentials

  # Storage configuration
  storage:
    size: 20Gi
    storageClass: fast-ssd

  # WAL storage (separate PVC for better I/O isolation)
  walStorage:
    size: 5Gi
    storageClass: fast-ssd

  # Superuser secret
  superuserSecret:
    name: postgres-superuser-secret

  # Enable monitoring
  monitoring:
    enablePodMonitor: true

  # Affinity: spread instances across nodes
  affinity:
    podAntiAffinityType: preferred
    topologyKey: kubernetes.io/hostname
```

## Step 4: Create Required Secrets

```yaml
# infrastructure/databases/cnpg/postgres-secrets.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: postgres-app-credentials
  namespace: databases
type: kubernetes.io/basic-auth
stringData:
  username: app
  password: "AppPassword123!"
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-superuser-secret
  namespace: databases
type: kubernetes.io/basic-auth
stringData:
  username: postgres
  password: "SuperuserPassword!"
```

## Step 5: Configure Scheduled Backups

```yaml
# infrastructure/databases/cnpg/backup-schedule.yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: postgres-daily-backup
  namespace: databases
spec:
  schedule: "0 2 * * *"   # daily at 2 AM
  cluster:
    name: postgres-primary
  # Backup to S3
  backupOwnerReference: cluster
---
# infrastructure/databases/cnpg/backup-object-store.yaml
# Add to the Cluster spec's backup section:
# backup:
#   barmanObjectStore:
#     destinationPath: s3://my-backups/postgres/
#     s3Credentials:
#       accessKeyId:
#         name: s3-credentials
#         key: ACCESS_KEY_ID
#       secretAccessKey:
#         name: s3-credentials
#         key: SECRET_ACCESS_KEY
#     wal:
#       compression: gzip
#     data:
#       compression: gzip
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/production/databases-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cloudnative-pg
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/cnpg
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cnpg-controller-manager
      namespace: cnpg-system
```

## Step 7: Verify the Cluster

```bash
# Check operator is running
kubectl get deployment -n cnpg-system

# Check cluster status
kubectl get cluster postgres-primary -n databases

# Check individual instances
kubectl get pods -n databases -l cnpg.io/cluster=postgres-primary

# Connect to the primary
kubectl exec -n databases -it postgres-primary-1 -- psql -U app app

# Check replication status
kubectl exec -n databases -it postgres-primary-1 -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

## Best Practices

- Store all PostgreSQL credentials in SealedSecrets or External Secrets — never commit plaintext passwords to Git.
- Use separate PVCs for WAL storage (`walStorage`) to isolate write-intensive WAL I/O from data reads.
- Enable Prometheus monitoring via `monitoring.enablePodMonitor: true` and import the CNPG Grafana dashboard.
- Pin the `imageName` to a specific PostgreSQL patch version and use Flux image policies for automated upgrade PRs.
- Configure `minSyncReplicas: 1` for production clusters to ensure at least one replica is always in sync before committing transactions.

## Conclusion

CloudNativePG deployed through Flux CD gives you a production-grade PostgreSQL operator that handles failover, rolling upgrades, and backup management natively within Kubernetes. Every cluster change — adding a replica, adjusting parameters, rotating credentials — is a Git commit that Flux applies safely. The operator's tight Kubernetes integration means your database clusters benefit from the same observability and automation as your application workloads.

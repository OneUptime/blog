# How to Deploy Percona MongoDB Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MongoDB, Percona, Database Operators, NoSQL

Description: Deploy the Percona MongoDB Operator for production MongoDB replica sets and sharded clusters using Flux CD HelmRelease.

---

## Introduction

The Percona Operator for MongoDB manages MongoDB replica sets and sharded clusters on Kubernetes, providing automated failover, rolling upgrades, backup via Percona Backup for MongoDB (PBM), and optional PMM monitoring integration. It supports both Percona Server for MongoDB (PSMDB) and is built on the community MongoDB operator patterns.

Managing MongoDB clusters through Flux CD ensures that topology, backup configuration, and user settings are version-controlled. When a team needs to add a shard or change a MongoDB parameter, the change flows through a pull request with clear diffs — not a manual `mongo` shell command applied directly to the cluster.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- S3-compatible storage for backups
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Percona HelmRepository

```yaml
# infrastructure/sources/percona-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: percona
  namespace: flux-system
spec:
  interval: 12h
  url: https://percona.github.io/percona-helm-charts
```

## Step 2: Deploy the Percona MongoDB Operator

```yaml
# infrastructure/databases/percona-mongodb/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mongodb
```

```yaml
# infrastructure/databases/percona-mongodb/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: percona-server-mongodb-operator
  namespace: mongodb
spec:
  interval: 30m
  chart:
    spec:
      chart: psmdb-operator
      version: "1.16.3"
      sourceRef:
        kind: HelmRepository
        name: percona
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
```

## Step 3: Create a MongoDB Replica Set

```yaml
# infrastructure/databases/percona-mongodb/psmdb-cluster.yaml
apiVersion: psmdb.percona.com/v1
kind: PerconaServerMongoDB
metadata:
  name: my-cluster
  namespace: mongodb
spec:
  crVersion: 1.16.3
  image: percona/percona-server-mongodb:7.0.8-5
  imagePullPolicy: IfNotPresent
  allowUnsafeConfigurations: false
  updateStrategy: SmartUpdate

  upgradeOptions:
    apply: Disabled
    schedule: ""

  secrets:
    users: my-cluster-secrets

  # Replica Set configuration
  replsets:
    - name: rs0
      size: 3
      resources:
        limits:
          cpu: "1"
          memory: 2G
        requests:
          cpu: "500m"
          memory: 1G
      volumeSpec:
        persistent:
          storageClassName: fast-ssd
          resources:
            requests:
              storage: 20Gi
      # MongoDB configuration
      configuration: |
        operationProfiling:
          slowOpThresholdMs: 100
          mode: slowOp
        systemLog:
          verbosity: 0
        storage:
          wiredTiger:
            engineConfig:
              cacheSizeGB: 0.5
      affinity:
        antiAffinityTopologyKey: kubernetes.io/hostname
      # Expose replica set members via ClusterIP
      expose:
        enabled: false
        exposeType: ClusterIP

  # Sharding (enable for large datasets)
  sharding:
    enabled: false  # set to true for sharded cluster

  # Mongos (query router for sharded clusters)
  # mongos:
  #   size: 2
  #   ...

  # PMM monitoring
  pmm:
    enabled: false

  # Backup configuration using Percona Backup for MongoDB
  backup:
    enabled: true
    image: percona/percona-backup-mongodb:2.4.1
    storages:
      s3-us-east:
        type: s3
        s3:
          bucket: my-mongodb-backups
          credentialsSecret: backup-s3-credentials
          region: us-east-1
          prefix: my-cluster
    tasks:
      - name: daily-backup
        enabled: true
        schedule: "0 2 * * *"
        keep: 7
        storageName: s3-us-east
        compressionType: gzip
        compressionLevel: 6
```

## Step 4: Create Cluster Secrets

```yaml
# infrastructure/databases/percona-mongodb/secrets.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: my-cluster-secrets
  namespace: mongodb
type: Opaque
stringData:
  MONGODB_BACKUP_USER: backup
  MONGODB_BACKUP_PASSWORD: "BackupPassword!"
  MONGODB_DATABASE_ADMIN_USER: databaseAdmin
  MONGODB_DATABASE_ADMIN_PASSWORD: "AdminPassword!"
  MONGODB_CLUSTER_ADMIN_USER: clusterAdmin
  MONGODB_CLUSTER_ADMIN_PASSWORD: "ClusterAdminPassword!"
  MONGODB_CLUSTER_MONITOR_USER: clusterMonitor
  MONGODB_CLUSTER_MONITOR_PASSWORD: "MonitorPassword!"
  MONGODB_USER_ADMIN_USER: userAdmin
  MONGODB_USER_ADMIN_PASSWORD: "UserAdminPassword!"
---
apiVersion: v1
kind: Secret
metadata:
  name: backup-s3-credentials
  namespace: mongodb
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
  AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/mongodb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: percona-mongodb
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/percona-mongodb
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: percona-server-mongodb-operator
      namespace: mongodb
```

## Step 6: Verify the Replica Set

```bash
# Check operator
kubectl get deployment percona-server-mongodb-operator -n mongodb

# Check PSMDB cluster status
kubectl get psmdb my-cluster -n mongodb

# Check pods (3 replicas)
kubectl get pods -n mongodb

# Connect to MongoDB
kubectl port-forward svc/my-cluster-rs0 27017:27017 -n mongodb
mongosh "mongodb://databaseAdmin:AdminPassword!@localhost:27017/admin"

# Check replica set status
mongosh "mongodb://clusterAdmin:ClusterAdminPassword!@localhost:27017/admin" \
  --eval "rs.status()"

# Check backup status
kubectl get psmdb-backup -n mongodb
```

## Best Practices

- Set `allowUnsafeConfigurations: false` to prevent the operator from creating clusters that violate safety constraints.
- Use `storage.wiredTiger.engineConfig.cacheSizeGB` to limit WiredTiger cache size, preventing MongoDB from consuming all node memory.
- Enable the slow operation profiler with `operationProfiling.slowOpThresholdMs: 100` to catch performance issues early.
- Use affinity rules (`antiAffinityTopologyKey: kubernetes.io/hostname`) to ensure replica set members are on different nodes.
- Configure backups with `compressionType: gzip` to reduce S3 storage costs.

## Conclusion

The Percona MongoDB Operator deployed via Flux CD provides an enterprise-grade MongoDB management platform with automated replica set management, rolling upgrades, and pgBackup-equivalent backup capabilities through PBM. Every cluster configuration change is a Git commit reviewed by your team. From simple replica sets to complex sharded clusters, the operator handles the operational complexity while Flux ensures the desired state is always applied.

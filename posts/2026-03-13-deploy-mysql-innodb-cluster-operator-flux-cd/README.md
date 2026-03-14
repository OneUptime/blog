# How to Deploy MySQL InnoDB Cluster Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MySQL, InnoDB Cluster, Database Operators, HA

Description: Deploy the MySQL InnoDB Cluster Operator for high-availability MySQL on Kubernetes using Flux CD HelmRelease.

---

## Introduction

The MySQL InnoDB Cluster Operator (mysql-operator) is Oracle's official Kubernetes operator for MySQL InnoDB Cluster, which uses MySQL Group Replication under the hood for synchronous, multi-primary or single-primary HA. Unlike XtraDB Cluster which uses Galera, InnoDB Cluster is a native MySQL feature - no Percona distribution required. It includes MySQL Router for intelligent read/write routing and MySQL Shell for administrative operations.

Deploying the MySQL InnoDB Cluster Operator through Flux CD gives you GitOps control over cluster creation, MySQL Router deployment, and configuration management. Version upgrades and topology changes flow through pull requests, making your MySQL fleet auditable and consistent.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed

## Step 1: Add the MySQL Operator HelmRepository

```yaml
# infrastructure/sources/mysql-operator-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: mysql-operator
  namespace: flux-system
spec:
  interval: 12h
  url: https://mysql.github.io/mysql-operator
```

## Step 2: Deploy the MySQL Operator

```yaml
# infrastructure/databases/mysql-innodb/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mysql-operator
```

```yaml
# infrastructure/databases/mysql-innodb/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mysql-operator
  namespace: mysql-operator
spec:
  interval: 30m
  chart:
    spec:
      chart: mysql-operator
      version: "2.2.1"
      sourceRef:
        kind: HelmRepository
        name: mysql-operator
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    image:
      pullPolicy: IfNotPresent
    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
```

## Step 3: Create a MySQL InnoDB Cluster

```yaml
# infrastructure/databases/mysql-innodb/mysql-cluster.yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: mycluster
  namespace: databases
spec:
  secretName: mycluster-credentials
  tlsUseSelfSigned: true  # set to false and provide certs in production

  instances: 3
  router:
    instances: 2  # MySQL Router instances for connection routing

  # MySQL version and image
  version: "8.0.36"

  # Pod spec for MySQL instances
  podSpec:
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        cpu: "2"
        memory: "2Gi"

  # Storage for each MySQL instance
  datadirVolumeClaimTemplate:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 20Gi

  # MySQL configuration
  mycnf: |
    [mysqld]
    max_connections=200
    max_allowed_packet=128M
    innodb_buffer_pool_size=512M
    innodb_log_file_size=256M
    # Group Replication settings
    loose-group_replication_message_cache_size=128M
    # Slow query log
    slow_query_log=ON
    long_query_time=1
    # Binary log
    binlog_expire_logs_seconds=604800  # 7 days
    max_binlog_size=500M

  # Auto-configure Group Replication (recommended)
  baseServerId: 1000

  # Backup configuration
  backupSchedules:
    - name: daily-backup
      schedule: "0 3 * * *"
      deleteBackupData: false
      enabled: true
      backupProfile:
        dumpInstance:
          storage:
            s3:
              bucketName: my-mysql-backups
              config: backup-s3-credentials
              prefix: mycluster/daily
              region: us-east-1
```

## Step 4: Create Cluster Credentials

```yaml
# infrastructure/databases/mysql-innodb/credentials.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: mycluster-credentials
  namespace: databases
type: Opaque
stringData:
  rootUser: root
  rootHost: "%"
  rootPassword: "RootPassword123!"
```

## Step 5: Flux Kustomization with Dependency Ordering

```yaml
# clusters/production/mysql-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mysql-innodb-operator
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/mysql-innodb
  prune: true
  dependsOn:
    - name: infrastructure-sources
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: mysql-operator
      namespace: mysql-operator
```

## Step 6: Verify and Connect

```bash
# Check operator health
kubectl get deployment mysql-operator -n mysql-operator

# Check InnoDBCluster status
kubectl get innodbcluster mycluster -n databases

# Check all pods (3 MySQL + 2 Router)
kubectl get pods -n databases

# Connect read-write via Router (port 6446)
kubectl port-forward svc/mycluster 6446:6446 -n databases
mysql -h 127.0.0.1 -P 6446 -u root -p'RootPassword123!'

# Connect read-only via Router (port 6447)
kubectl port-forward svc/mycluster 6447:6447 -n databases
mysql -h 127.0.0.1 -P 6447 -u root -p'RootPassword123!'

# Check Group Replication status inside MySQL
kubectl exec -n databases mycluster-0 -- \
  mysqlsh root:RootPassword123!@localhost --sql \
  -e "SELECT * FROM performance_schema.replication_group_members;"
```

## Step 7: Perform a Rolling Upgrade

Update the MySQL version in Git:

```yaml
# Change version: "8.0.36" to version: "8.0.37"
```

Commit and push. Flux reconciles the InnoDBCluster spec, and the operator performs a rolling upgrade of the MySQL instances with no downtime via Group Replication failover.

## Best Practices

- Use `router.instances: 2` for production to avoid a single MySQL Router being a bottleneck or SPOF.
- Set `tlsUseSelfSigned: false` in production and provide certificates via cert-manager for encrypted client connections.
- Configure `binlog_expire_logs_seconds=604800` (7 days) to prevent binary logs from consuming all disk space.
- Monitor Group Replication with `performance_schema.replication_group_members` to track member status.
- Enable the slow query log with `long_query_time=1` (1 second) to capture problematic queries early.

## Conclusion

The MySQL InnoDB Cluster Operator deployed via Flux CD provides an Oracle-supported, enterprise-grade MySQL HA solution that uses native Group Replication. MySQL Router handles intelligent read/write split routing, and the operator manages rolling upgrades safely. With Flux managing the operator and cluster CRDs, your MySQL infrastructure is fully described in Git and automatically kept in sync with your desired state.

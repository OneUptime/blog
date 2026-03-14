# How to Deploy Percona MySQL Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MySQL, Percona, XtraDB, Database Operators

Description: Deploy the Percona MySQL Operator for PerconaXtraDB clusters on Kubernetes using Flux CD for GitOps-managed MySQL high availability.

---

## Introduction

The Percona Operator for MySQL based on Percona XtraDB Cluster (PXC) provides synchronous multi-primary MySQL replication using Galera. Unlike traditional MySQL replication which has a single primary and read replicas, XtraDB Cluster allows writes on any node and automatically handles conflict resolution. This makes it ideal for active-active deployments where all replicas need to be writable.

Deploying the Percona MySQL Operator through Flux CD ensures your MySQL cluster topology, backup configuration, and PMM monitoring settings are version-controlled. Scaling, credential rotation, and operator upgrades all flow through the same GitOps pull request workflow.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- `kubectl` and `flux` CLIs installed
- S3-compatible storage for backups

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

## Step 2: Deploy the Percona MySQL Operator

```yaml
# infrastructure/databases/percona-mysql/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mysql
```

```yaml
# infrastructure/databases/percona-mysql/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: percona-mysql-operator
  namespace: mysql
spec:
  interval: 30m
  chart:
    spec:
      chart: pxc-operator
      version: "1.15.1"
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

## Step 3: Create a PerconaXtraDBCluster

```yaml
# infrastructure/databases/percona-mysql/pxc-cluster.yaml
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBCluster
metadata:
  name: cluster1
  namespace: mysql
spec:
  crVersion: 1.15.1
  allowUnsafeConfigurations: false
  updateStrategy: SmartUpdate
  upgradeOptions:
    apply: Disabled   # disable auto-upgrades in production
    schedule: "0 4 * * *"

  secretsName: cluster1-secrets

  # PXC nodes (Galera cluster members)
  pxc:
    size: 3
    image: percona/percona-xtradb-cluster:8.0.36-28.1
    resources:
      requests:
        memory: 1G
        cpu: "600m"
      limits:
        memory: 2G
        cpu: "1"
    volumeSpec:
      persistentVolumeClaim:
        resources:
          requests:
            storage: 20Gi
    # MySQL configuration
    configuration: |
      [mysqld]
      max_connections=200
      max_allowed_packet=128M
      innodb_buffer_pool_size=512M
      innodb_log_file_size=256M
      innodb_flush_log_at_trx_commit=1
      sync_binlog=1
      # Galera settings
      wsrep_slave_threads=4
      wsrep_trx_fragment_size=1073741824
    # Anti-affinity: one PXC pod per node
    affinity:
      antiAffinityTopologyKey: kubernetes.io/hostname

  # HAProxy for load balancing
  haproxy:
    enabled: true
    size: 2
    image: percona/percona-xtradb-cluster-operator:1.15.1-haproxy
    resources:
      requests:
        memory: 128M
        cpu: "200m"
      limits:
        memory: 256M
        cpu: "400m"

  # ProxySQL alternative (use either haproxy or proxysql, not both)
  proxysql:
    enabled: false

  # PMM monitoring (optional)
  pmm:
    enabled: false
    image: percona/pmm-client:2.41.1
    serverHost: monitoring-service

  # Backup configuration
  backup:
    image: percona/percona-xtradb-cluster-operator:1.15.1-pxc8.0-backup
    storages:
      s3-us-east:
        type: s3
        s3:
          bucket: my-mysql-backups
          credentialsSecret: backup-s3-credentials
          region: us-east-1
    schedule:
      - name: daily-backup
        schedule: "0 2 * * *"
        keep: 7
        storageName: s3-us-east
```

## Step 4: Create Cluster Secrets

```yaml
# infrastructure/databases/percona-mysql/secrets.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: cluster1-secrets
  namespace: mysql
type: Opaque
stringData:
  root: "RootPassword123!"
  xtrabackup: "XtrabackupPassword!"
  monitor: "MonitorPassword!"
  clustercheck: "ClusterCheckPassword!"
  proxyadmin: "ProxyAdminPassword!"
  pmmserver: ""
  operator: "OperatorPassword!"
  replication: "ReplicationPassword!"
---
apiVersion: v1
kind: Secret
metadata:
  name: backup-s3-credentials
  namespace: mysql
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
  AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/mysql-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: percona-mysql
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/percona-mysql
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: percona-xtradb-cluster-operator
      namespace: mysql
```

## Step 6: Verify the Cluster

```bash
# Check operator status
kubectl get deployment percona-xtradb-cluster-operator -n mysql

# Check PXC cluster status
kubectl get pxc cluster1 -n mysql

# Check all pods (3 PXC + 2 HAProxy)
kubectl get pods -n mysql

# Connect to the cluster via HAProxy
kubectl port-forward svc/cluster1-haproxy 3306:3306 -n mysql
mysql -h 127.0.0.1 -u root -p'RootPassword123!'

# Check Galera cluster status
kubectl exec -n mysql cluster1-pxc-0 -- mysql -u root -p'RootPassword123!' \
  -e "SHOW STATUS LIKE 'wsrep_%';"
```

## Best Practices

- Use `haproxy.enabled: true` instead of ProxySQL for simplicity unless you need ProxySQL's advanced query routing features.
- Set `allowUnsafeConfigurations: false` in production to prevent accidental single-node deployments.
- Set `innodb_flush_log_at_trx_commit=1` and `sync_binlog=1` for ACID compliance, accepting the performance trade-off.
- Configure backups with `keep: 7` (or more) and test restore procedures regularly.
- Monitor `wsrep_cluster_size` and `wsrep_local_state_comment` metrics to detect cluster membership issues early.

## Conclusion

The Percona MySQL Operator deployed via Flux CD gives you a production-grade XtraDB Cluster with synchronous multi-primary replication, automated backups, and connection load balancing through HAProxy. Every aspect of the cluster — from MySQL parameters to backup schedules — is declared in Git and applied by Flux. For workloads that require MySQL compatibility with high-availability writes on any node, XtraDB Cluster managed by this operator is a compelling choice.

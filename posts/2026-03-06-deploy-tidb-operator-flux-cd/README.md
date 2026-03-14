# How to Deploy TiDB Operator with Flux CD - 2026-03-06

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, TiDB, Kubernetes, Database, GitOps, Operator, Distributed SQL, NewSQL, Tikv

Description: A step-by-step guide to deploying the TiDB Operator and TiDB clusters on Kubernetes using Flux CD for GitOps-managed distributed SQL databases.

---

## Introduction

TiDB (Titanium Database) is an open-source, distributed SQL database that supports Hybrid Transactional and Analytical Processing (HTAP) workloads. It features MySQL compatibility, horizontal scalability, strong consistency, and high availability. The TiDB Operator automates the deployment and management of TiDB clusters on Kubernetes.

A TiDB cluster consists of three main components: PD (Placement Driver) for metadata and scheduling, TiKV for distributed key-value storage, and TiDB for SQL processing. This guide walks through deploying all components using Flux CD.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later) with at least three worker nodes
- Flux CD installed and bootstrapped on your cluster
- A storage class that supports dynamic provisioning
- kubectl configured to access your cluster
- A Git repository connected to Flux CD
- Nodes with sufficient resources (TiKV is memory-intensive)

## Repository Structure

```text
clusters/
  my-cluster/
    databases/
      tidb/
        namespace.yaml
        helmrepository.yaml
        helmrelease-operator.yaml
        helmrelease-crds.yaml
        tidb-cluster.yaml
        tidb-monitor.yaml
        backup.yaml
        kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/databases/tidb/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tidb
  labels:
    app.kubernetes.io/name: tidb
    app.kubernetes.io/part-of: database
```

## Step 2: Add the PingCAP Helm Repository

```yaml
# clusters/my-cluster/databases/tidb/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: pingcap
  namespace: tidb
spec:
  interval: 1h
  # Official PingCAP Helm chart repository
  url: https://charts.pingcap.org/
```

## Step 3: Deploy TiDB Operator CRDs

CRDs must be installed before the operator.

```yaml
# clusters/my-cluster/databases/tidb/helmrelease-crds.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: tidb-operator-crds
  namespace: tidb
spec:
  interval: 30m
  chart:
    spec:
      chart: tidb-operator
      version: "1.5.x"
      sourceRef:
        kind: HelmRepository
        name: pingcap
        namespace: tidb
  timeout: 10m
  # Only install CRDs
  values:
    # This is handled by the separate CRD chart if available
    # Otherwise install via the operator chart
    operatorImage: pingcap/tidb-operator:v1.5.3
```

## Step 4: Deploy the TiDB Operator

```yaml
# clusters/my-cluster/databases/tidb/helmrelease-operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: tidb-operator
  namespace: tidb
spec:
  interval: 30m
  dependsOn:
    - name: tidb-operator-crds
  chart:
    spec:
      chart: tidb-operator
      version: "1.5.x"
      sourceRef:
        kind: HelmRepository
        name: pingcap
        namespace: tidb
  timeout: 10m
  values:
    # Operator resource configuration
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Controller manager configuration
    controllerManager:
      # Number of workers for reconciliation
      workers: 5
      # Auto-failover settings
      autoFailover: true
    # Scheduler configuration for TiDB-aware pod scheduling
    scheduler:
      create: true
      replicas: 1
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 250m
          memory: 256Mi
```

## Step 5: Deploy a TiDB Cluster

```yaml
# clusters/my-cluster/databases/tidb/tidb-cluster.yaml
apiVersion: pingcap.com/v1alpha1
kind: TidbCluster
metadata:
  name: tidb-cluster
  namespace: tidb
spec:
  # TiDB cluster version
  version: v7.5.1

  # Timezone for the cluster
  timezone: UTC

  # PV reclaim policy
  pvReclaimPolicy: Retain

  # Enable TLS for internal communication
  enableTLSCluster: false

  # PD (Placement Driver) configuration
  pd:
    # PD manages metadata and scheduling
    replicas: 3
    # Storage for PD metadata
    storageClassName: standard
    requests:
      storage: 10Gi
    # Resource limits
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: "1"
        memory: 2Gi
    # PD configuration parameters
    config:
      log:
        level: info
      schedule:
        # Maximum number of stores allowed to be down simultaneously
        max-store-down-time: "30m"
        # Region scheduling limits
        leader-schedule-limit: 4
        region-schedule-limit: 2048
      replication:
        # Number of replicas for each data region
        max-replicas: 3
    # Anti-affinity to spread PD pods
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/component: pd
                  app.kubernetes.io/instance: tidb-cluster
              topologyKey: kubernetes.io/hostname

  # TiKV (distributed key-value storage) configuration
  tikv:
    replicas: 3
    # Storage for TiKV data
    storageClassName: standard
    requests:
      storage: 100Gi
    # Resource limits (TiKV is memory-intensive)
    resources:
      requests:
        cpu: "1"
        memory: 4Gi
      limits:
        cpu: "4"
        memory: 8Gi
    # TiKV configuration parameters
    config:
      log-level: info
      # RocksDB configuration
      rocksdb:
        # Block cache size (typically 30-50% of memory)
        defaultcf:
          block-cache-size: "2GB"
        writecf:
          block-cache-size: "1GB"
        lockcf:
          block-cache-size: "256MB"
      # Storage configuration
      storage:
        # Reserve space on disk
        reserve-space: "2GB"
      # Raftstore configuration
      raftstore:
        # Region split size
        region-split-size: "96MB"
    # Anti-affinity for TiKV pods
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app.kubernetes.io/component: tikv
                  app.kubernetes.io/instance: tidb-cluster
              topologyKey: kubernetes.io/hostname

  # TiDB (SQL layer) configuration
  tidb:
    replicas: 2
    # Resource limits
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: "2"
        memory: 4Gi
    # TiDB configuration parameters
    config:
      log:
        level: info
      performance:
        # Maximum number of connections
        max-procs: 0
        # TCP keepalive
        tcp-keep-alive: true
      # Prepared plan cache for better performance
      prepared-plan-cache:
        enabled: true
        capacity: 1000
    # Service configuration for SQL access
    service:
      type: ClusterIP
      # MySQL-compatible port
      mysqlNodePort: 0
      # Status port for health checks
      statusNodePort: 0
    # Slow query log threshold (in milliseconds)
    slowLogThreshold: 300
```

## Step 6: Deploy TiDB Monitoring

```yaml
# clusters/my-cluster/databases/tidb/tidb-monitor.yaml
apiVersion: pingcap.com/v1alpha1
kind: TidbMonitor
metadata:
  name: tidb-monitor
  namespace: tidb
spec:
  # Reference to the TiDB cluster
  clusters:
    - name: tidb-cluster
      namespace: tidb

  # Prometheus configuration
  prometheus:
    baseImage: prom/prometheus
    version: v2.50.0
    # Monitoring data retention
    retentionTime: "7d"
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: "1"
        memory: 2Gi
    # Storage for metrics data
    storageClassName: standard
    storage: 50Gi
    service:
      type: ClusterIP

  # Grafana configuration
  grafana:
    baseImage: grafana/grafana
    version: "10.3.3"
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    service:
      type: ClusterIP
    # Grafana admin password
    envs:
      GF_SECURITY_ADMIN_PASSWORD: "admin-password-change-me"

  # TiDB Dashboard initializer
  initializer:
    baseImage: pingcap/tidb-monitor-initializer
    version: v7.5.1
```

## Step 7: Configure Backup

```yaml
# clusters/my-cluster/databases/tidb/backup.yaml
# S3 credentials for backup storage
apiVersion: v1
kind: Secret
metadata:
  name: tidb-s3-credentials
  namespace: tidb
type: Opaque
stringData:
  access_key: "your-access-key"
  secret_key: "your-secret-key"
---
# Scheduled backup using TiDB Backup CR
apiVersion: pingcap.com/v1alpha1
kind: BackupSchedule
metadata:
  name: tidb-cluster-backup-schedule
  namespace: tidb
spec:
  # Maximum number of backups to retain
  maxBackups: 7
  maxReservedTime: "168h"
  # Backup schedule (daily at 2 AM UTC)
  schedule: "0 2 * * *"
  backupTemplate:
    # Reference to the TiDB cluster
    from:
      host: tidb-cluster-tidb.tidb.svc.cluster.local
      port: 4000
      user: root
      secretName: tidb-root-secret
    br:
      cluster: tidb-cluster
      clusterNamespace: tidb
      # Use BR (Backup & Restore) tool for efficient backups
      sendCredToTikv: true
    s3:
      provider: aws
      region: us-east-1
      bucket: tidb-backups
      prefix: tidb-cluster/scheduled
      secretName: tidb-s3-credentials
    storageClassName: standard
    storageSize: 100Gi
---
# Root user secret for backups
apiVersion: v1
kind: Secret
metadata:
  name: tidb-root-secret
  namespace: tidb
type: Opaque
stringData:
  user: root
  password: ""
```

## Step 8: Create the Kustomization

```yaml
# clusters/my-cluster/databases/tidb/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease-crds.yaml
  - helmrelease-operator.yaml
  - tidb-cluster.yaml
  - tidb-monitor.yaml
  - backup.yaml
```

## Step 9: Create the Flux Kustomization

```yaml
# clusters/my-cluster/databases/tidb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tidb
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/databases/tidb
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: tidb-operator
      namespace: tidb
  timeout: 30m
```

## Verify the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations tidb

# Verify operator pods
kubectl get pods -n tidb -l app.kubernetes.io/name=tidb-operator

# Check TiDB cluster status
kubectl get tidbcluster -n tidb

# View all cluster pods
kubectl get pods -n tidb -l app.kubernetes.io/instance=tidb-cluster

# Check PD members
kubectl exec -it tidb-cluster-pd-0 -n tidb -- \
  /pd-ctl member

# Check TiKV stores
kubectl exec -it tidb-cluster-pd-0 -n tidb -- \
  /pd-ctl store

# Connect to TiDB via MySQL client
kubectl run mysql-client --rm -it --restart=Never \
  --image=mysql:8.0 --namespace=tidb -- \
  mysql -h tidb-cluster-tidb.tidb.svc.cluster.local -P 4000 -u root

# Access Grafana dashboard
kubectl port-forward svc/tidb-monitor-grafana -n tidb 3000:3000
```

## Scaling the Cluster

TiDB components can be scaled independently. Update the replicas in the TidbCluster manifest:

```yaml
spec:
  # Scale TiKV for more storage capacity
  tikv:
    replicas: 5
  # Scale TiDB for more query throughput
  tidb:
    replicas: 4
```

After pushing to Git, Flux CD will reconcile and TiDB Operator will handle the scaling automatically, rebalancing data across new TiKV nodes.

## Application Connection

TiDB is MySQL-compatible, so you can use any MySQL client or driver:

```yaml
# Application connection configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-tidb-config
  namespace: default
data:
  # MySQL-compatible connection string
  DB_HOST: "tidb-cluster-tidb.tidb.svc.cluster.local"
  DB_PORT: "4000"
  DB_USER: "root"
  DB_NAME: "test"
```

## Troubleshooting

1. **PD pods not starting**: Verify that PD storage is available and the storage class exists. Check PD logs for cluster initialization errors.

2. **TiKV stores offline**: Check that TiKV pods have sufficient memory and that RocksDB block cache is not configured larger than available memory.

3. **TiDB connection timeouts**: Ensure the TiDB service is accessible and that PD and TiKV are healthy first, as TiDB depends on them.

```bash
# Check operator logs
kubectl logs -n tidb -l app.kubernetes.io/name=tidb-operator --tail=100

# Check PD logs
kubectl logs -n tidb tidb-cluster-pd-0 --tail=100

# Check TiKV logs
kubectl logs -n tidb tidb-cluster-tikv-0 --tail=100

# Check TiDB logs
kubectl logs -n tidb tidb-cluster-tidb-0 --tail=100

# Check backup status
kubectl get backup -n tidb
kubectl get backupschedule -n tidb
```

## Conclusion

You have successfully deployed a TiDB cluster on Kubernetes using the TiDB Operator and Flux CD. The setup provides a MySQL-compatible distributed SQL database with HTAP capabilities, automatic data rebalancing, integrated monitoring with Prometheus and Grafana, and scheduled backups. All configuration is managed declaratively through your Git repository, enabling reliable and reproducible database infrastructure management.

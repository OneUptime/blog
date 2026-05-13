# How to Deploy TiDB Operator with Flux CD - 2026-03-13

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, TiDB, HTAP, Distributed Database, PingCAP

Description: Deploy the TiDB Operator for distributed HTAP database on Kubernetes using Flux CD for GitOps-managed TiDB clusters.

---

## Introduction

TiDB is an open-source distributed SQL database by PingCAP that supports Hybrid Transactional and Analytical Processing (HTAP). It is MySQL-compatible for OLTP workloads and includes TiFlash - a columnar storage engine - for real-time OLAP queries without ETL. TiDB separates storage (TiKV for row storage, TiFlash for columnar) from compute (TiDB servers), allowing independent scaling of each tier.

The TiDB Operator manages TiDB clusters on Kubernetes through the `TidbCluster` CRD. Deploying through Flux CD gives you GitOps control over each cluster component's replicas, resources, and configuration - critical for a complex multi-tier system like TiDB.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs (SSDs strongly recommended)
- At least 3 nodes with 4+ CPU and 8+ GiB RAM for TiKV
- `kubectl` and `flux` CLIs installed

## Step 1: Add the PingCAP HelmRepository

```yaml
# infrastructure/sources/pingcap-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: pingcap
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.pingcap.org
```

```yaml
# infrastructure/sources/tidb-operator-git.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: tidb-operator-source
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/pingcap/tidb-operator.git
  ref:
    tag: v1.6.1
```

## Step 2: Deploy the TiDB Operator and CRDs

```yaml
# infrastructure/databases/tidb/operator/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tidb-admin
---
apiVersion: v1
kind: Namespace
metadata:
  name: tidb-cluster
```

```yaml
# infrastructure/databases/tidb/operator/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: tidb-operator
  namespace: tidb-admin
spec:
  interval: 30m
  chart:
    spec:
      chart: tidb-operator
      version: "v1.6.1"
      sourceRef:
        kind: HelmRepository
        name: pingcap
        namespace: flux-system
  values:
    controllerManager:
      resources:
        requests:
          cpu: "250m"
          memory: "500Mi"
        limits:
          cpu: "500m"
          memory: "1Gi"
    scheduler:
      create: true
      resources:
        requests:
          cpu: "250m"
          memory: "500Mi"
```

## Step 3: Create a TiDB Cluster

```yaml
# infrastructure/databases/tidb/cluster/tidb-cluster.yaml
apiVersion: pingcap.com/v1alpha1
kind: TidbCluster
metadata:
  name: basic
  namespace: tidb-cluster
spec:
  version: v8.1.0
  timezone: UTC
  configUpdateStrategy: RollingUpdate

  # PD (Placement Driver) - manages cluster metadata and scheduling
  pd:
    baseImage: pingcap/pd
    version: v8.1.0
    replicas: 3
    requests:
      cpu: "500m"
      memory: "1Gi"
      storage: 10Gi
    limits:
      cpu: "1"
      memory: "2Gi"
    storageClassName: premium-ssd
    config: |
      [replication]
        max-replicas = 3
        location-labels = ["topology.kubernetes.io/zone"]
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                app.kubernetes.io/component: pd

  # TiDB (SQL layer) - stateless, horizontally scalable
  tidb:
    baseImage: pingcap/tidb
    version: v8.1.0
    replicas: 2
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
    config: |
      [performance]
        max-procs = 0
      [log]
        slow-threshold = 300
    service:
      type: ClusterIP

  # TiKV (row storage) - distributed, persistent
  tikv:
    baseImage: pingcap/tikv
    version: v8.1.0
    replicas: 3
    requests:
      cpu: "1"
      memory: "2Gi"
      storage: 100Gi
    limits:
      cpu: "2"
      memory: "4Gi"
    storageClassName: premium-ssd
    config: |
      [rocksdb]
        max-background-jobs = 4
      [raftstore]
        apply-max-batch-size = 1024
    affinity:
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                app.kubernetes.io/component: tikv
```

## Step 4: Enable TiFlash for OLAP (Optional)

Add the TiFlash component for columnar storage:

```yaml
  # TiFlash (columnar storage) - for OLAP queries
  tiflash:
    baseImage: pingcap/tiflash
    version: v8.1.0
    replicas: 1
    limits:
      cpu: "2"
      memory: "8Gi"
    storageClaims:
      - resources:
          requests:
            storage: 100Gi
        storageClassName: premium-ssd
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/production/tidb-crds-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tidb-operator-crds
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: tidb-operator-source
  path: ./manifests/crd/v1
  prune: false
  wait: true
  timeout: 5m
```

```yaml
# clusters/production/tidb-operator-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tidb-operator
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/tidb/operator
  prune: true
  dependsOn:
    - name: tidb-operator-crds
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: tidb-operator
      namespace: tidb-admin
  timeout: 5m
```

```yaml
# clusters/production/tidb-cluster-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tidb-cluster
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/tidb/cluster
  prune: true
  dependsOn:
    - name: tidb-operator
```

## Step 6: Verify and Connect

```bash
# Check TiDB cluster status
kubectl get tidbcluster basic -n tidb-cluster

# Check component pods
kubectl get pods -n tidb-cluster

# Port-forward TiDB SQL port
kubectl port-forward svc/basic-tidb 4000:4000 -n tidb-cluster

# Connect via MySQL client
mysql -h 127.0.0.1 -P 4000 -u root

# Check cluster status in TiDB
mysql -h 127.0.0.1 -P 4000 -u root -e "SELECT * FROM information_schema.cluster_info;"
```

## Best Practices

- Run 3 PD replicas for Raft quorum and 3 TiKV replicas for data replication factor of 3.
- Run TiDB SQL servers as stateless Deployments - scale them horizontally for more query throughput.
- Set `slow-threshold: 300` (300ms) in TiDB config to capture slow queries for optimization.
- Use TiFlash for aggregation and analytical queries - add `/*+ READ_FROM_STORAGE(TIFLASH[table_name]) */` hints or enable tiflash replicas via DDL.
- Monitor TiDB with Prometheus and Grafana by creating a `TidbMonitor` CR for the cluster.

## Conclusion

The TiDB Operator deployed via Flux CD gives you a GitOps-managed HTAP database that handles both transactional and analytical workloads without separate ETL pipelines. TiDB's MySQL compatibility means existing applications connect with minimal changes. With Flux managing all components - PD, TiDB, TiKV, and TiFlash - your HTAP cluster configuration is version-controlled and automatically reconciled, giving you the operational consistency required for mission-critical data infrastructure.

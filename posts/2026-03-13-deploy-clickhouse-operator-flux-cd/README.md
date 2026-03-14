# How to Deploy ClickHouse Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, ClickHouse, OLAP, Analytics, Database Operators

Description: Deploy the ClickHouse Operator for high-performance OLAP analytics on Kubernetes using Flux CD for GitOps-managed analytical databases.

---

## Introduction

ClickHouse is a columnar OLAP database designed for analytical queries over large datasets with blazing performance. It is used by companies like Cloudflare, Uber, and Yandex for real-time analytics at petabyte scale. ClickHouse's columnar storage, vectorized query execution, and aggressive compression make it significantly faster than traditional row-based databases for aggregation queries.

The Altinity ClickHouse Operator is the most widely used operator for managing ClickHouse clusters on Kubernetes, providing the `ClickHouseInstallation` CRD. Deploying through Flux CD gives you GitOps-managed analytics infrastructure where cluster topology, sharding configuration, and ClickHouse settings are version-controlled.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- Nodes with adequate CPU and memory for analytical queries
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Altinity HelmRepository

```yaml
# infrastructure/sources/altinity-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: altinity
  namespace: flux-system
spec:
  interval: 12h
  url: https://docs.altinity.com/clickhouse-operator
```

## Step 2: Deploy the ClickHouse Operator

```yaml
# infrastructure/databases/clickhouse/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: clickhouse
```

```yaml
# infrastructure/databases/clickhouse/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: clickhouse-operator
  namespace: clickhouse
spec:
  interval: 30m
  chart:
    spec:
      chart: altinity-clickhouse-operator
      version: "0.23.5"
      sourceRef:
        kind: HelmRepository
        name: altinity
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
    metrics:
      enabled: true
```

## Step 3: Deploy a ClickHouse Installation

```yaml
# infrastructure/databases/clickhouse/chi-cluster.yaml
apiVersion: clickhouse.altinity.com/v1
kind: ClickHouseInstallation
metadata:
  name: chi-demo
  namespace: clickhouse
spec:
  defaults:
    templates:
      podTemplate: pod-template
      dataVolumeClaimTemplate: data-volume
      logVolumeClaimTemplate: log-volume

  configuration:
    clusters:
      - name: cluster1
        # 2 shards × 2 replicas = 4 pods total
        layout:
          shardsCount: 2
          replicasCount: 2

    # Zookeeper for replication coordination
    zookeeper:
      nodes:
        - host: zookeeper.zookeeper.svc.cluster.local
          port: 2181

    # ClickHouse users
    users:
      app_user/password: "AppPassword123!"
      app_user/networks/ip:
        - "::/0"   # allow all IPs (restrict in production)
      app_user/profile: default
      app_user/quota: default

    # ClickHouse settings
    settings:
      max_connections: 200
      max_concurrent_queries: 100
      max_memory_usage: 10000000000   # 10 GB per query
      max_threads: 8
      default_database: myapp

    files:
      # Additional config files
      config.d/logging.xml: |
        <clickhouse>
          <logger>
            <level>warning</level>
            <size>1000M</size>
            <count>10</count>
          </logger>
        </clickhouse>

  templates:
    podTemplates:
      - name: pod-template
        spec:
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:24.6.2.17
              resources:
                requests:
                  cpu: "1"
                  memory: "4Gi"
                limits:
                  cpu: "4"
                  memory: "8Gi"
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    topologyKey: kubernetes.io/hostname
                    labelSelector:
                      matchLabels:
                        clickhouse.altinity.com/chi: chi-demo

    volumeClaimTemplates:
      - name: data-volume
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 200Gi
          storageClassName: premium-ssd

      - name: log-volume
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 10Gi
```

## Step 4: Deploy Zookeeper for Replication

```yaml
# infrastructure/databases/clickhouse/zookeeper.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: zookeeper
  namespace: zookeeper
spec:
  interval: 30m
  chart:
    spec:
      chart: zookeeper
      version: "12.4.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    replicaCount: 3
    resources:
      requests:
        cpu: "250m"
        memory: "512Mi"
      limits:
        cpu: "500m"
        memory: "1Gi"
    persistence:
      enabled: true
      size: 8Gi
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/clickhouse-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: clickhouse
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/clickhouse
  prune: true
  dependsOn:
    - name: zookeeper
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: clickhouse-operator
      namespace: clickhouse
```

## Step 6: Verify and Query

```bash
# Check cluster status
kubectl get chi chi-demo -n clickhouse

# Check pods (2 shards × 2 replicas = 4 pods)
kubectl get pods -n clickhouse

# Connect to ClickHouse
kubectl exec -n clickhouse chi-demo-cluster1-0-0-0 -- \
  clickhouse-client --user app_user --password 'AppPassword123!'

# Create a test table with sharding
kubectl exec -n clickhouse chi-demo-cluster1-0-0-0 -- clickhouse-client \
  --user app_user --password 'AppPassword123!' \
  --query "
    CREATE TABLE myapp.events ON CLUSTER cluster1 (
      event_id UInt64,
      event_time DateTime,
      user_id UInt32,
      action String
    )
    ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
    ORDER BY (event_time, user_id)
    PARTITION BY toYYYYMM(event_time);

    CREATE TABLE myapp.events_distributed ON CLUSTER cluster1
    AS myapp.events
    ENGINE = Distributed(cluster1, myapp, events, rand());
  "
```

## Best Practices

- Use `ReplicatedMergeTree` engine for all production tables - it coordinates replication through ZooKeeper automatically.
- Create `Distributed` tables on top of local `ReplicatedMergeTree` tables for transparent cross-shard querying.
- Set `max_memory_usage` per query to prevent a single heavy query from exhausting all node memory.
- Use `ORDER BY` clauses that match your most frequent query filters - ClickHouse uses this as a sparse index.
- Monitor ClickHouse with the Grafana ClickHouse datasource plugin and the operator's built-in metrics endpoint.

## Conclusion

The ClickHouse Operator deployed via Flux CD provides a production-grade analytical database with automatic sharding, replication, and GitOps-managed configuration. ClickHouse's columnar storage and vectorized execution make it ideal for real-time analytics use cases that require sub-second query response times on billions of rows. With Flux managing the operator and ClickHouseInstallation CRDs, your analytical infrastructure is as well-governed as your transactional databases.

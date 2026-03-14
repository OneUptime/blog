# How to Deploy YugabyteDB with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, YugabyteDB, Distributed SQL, Database

Description: Deploy YugabyteDB distributed SQL database on Kubernetes using Flux CD HelmRelease for GitOps-managed globally distributed data.

---

## Introduction

YugabyteDB is a high-performance distributed SQL database built on PostgreSQL's query layer and a distributed storage engine inspired by Google Spanner. It supports both YSQL (PostgreSQL-compatible) and YCQL (Cassandra-compatible) APIs, making it suitable for both relational and document workloads. YugabyteDB's automatic sharding, fault tolerance, and geo-distribution make it a compelling choice for global applications.

Deploying YugabyteDB through Flux CD gives you GitOps control over cluster sizing, replication factor, and configuration. The official Helm chart provides a rich values API that maps directly to YugabyteDB's startup flags.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs (SSDs required)
- Minimum 3 nodes with 4 CPU and 8 GiB RAM each
- `kubectl` and `flux` CLIs installed

## Step 1: Add the YugabyteDB HelmRepository

```yaml
# infrastructure/sources/yugabytedb-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: yugabytedb
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.yugabyte.com
```

## Step 2: Create the Namespace

```yaml
# infrastructure/databases/yugabytedb/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: yb-demo
```

## Step 3: Deploy YugabyteDB

```yaml
# infrastructure/databases/yugabytedb/yugabytedb.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: yugabytedb
  namespace: yb-demo
spec:
  interval: 30m
  chart:
    spec:
      chart: yugabyte
      version: "2.20.7"
      sourceRef:
        kind: HelmRepository
        name: yugabytedb
        namespace: flux-system
  values:
    # Image
    image:
      tag: 2.20.7.0-b156

    # Replication factor (RF=3 requires min 3 nodes)
    replicas:
      master: 3
      tserver: 3

    # Resource settings for master pods (manage cluster metadata)
    resource:
      master:
        requests:
          cpu: "500m"
          memory: "1Gi"
        limits:
          cpu: "1"
          memory: "2Gi"
      # Resource settings for tserver pods (store and serve data)
      tserver:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"

    # Storage for masters (metadata, small)
    storage:
      master:
        count: 1
        size: 10Gi
        storageClass: premium-ssd
      # Storage for tservers (data, larger)
      tserver:
        count: 1
        size: 100Gi
        storageClass: premium-ssd

    # YugabyteDB configuration flags
    gflags:
      master:
        default_memory_limit_to_ram_ratio: "0.25"
        replication_factor: "3"
      tserver:
        yb_num_shards_per_tserver: "4"
        ysql_num_shards_per_tserver: "4"
        default_memory_limit_to_ram_ratio: "0.5"
        # Enable connection pooling
        ysql_enable_packed_row: "true"
        # YSQL settings
        ysql_max_connections: "300"
        yb_enable_read_committed_isolation: "true"
        # Compression
        enable_snappy_compression: "true"

    # Enable TLS
    tls:
      enabled: true

    # Expose services
    services:
      # YSQL endpoint (PostgreSQL-compatible, port 5433)
      master:
        clusterIP: ""
        type: ClusterIP
      tserver:
        clusterIP: ""
        type: ClusterIP
```

## Step 4: Enable Authentication

Create the YSQL superuser password:

```yaml
# infrastructure/databases/yugabytedb/auth-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: yb-configure-auth
  namespace: yb-demo
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: configure
          image: yugabytedb/yugabyte:2.20.7.0-b156
          command:
            - /bin/sh
            - -c
            - |
              until ysqlsh -h yb-tservers.yb-demo.svc.cluster.local \
                -p 5433 -U yugabyte -c "SELECT 1;" 2>/dev/null; do
                echo "Waiting for YSQL..."; sleep 5
              done
              # Create application user
              ysqlsh -h yb-tservers.yb-demo.svc.cluster.local -p 5433 \
                -U yugabyte -c "
                  CREATE DATABASE myapp;
                  CREATE USER app_user WITH PASSWORD 'AppPassword123!';
                  GRANT ALL PRIVILEGES ON DATABASE myapp TO app_user;
                "
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/yugabytedb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: yugabytedb
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/yugabytedb
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: yb-master
      namespace: yb-demo
    - apiVersion: apps/v1
      kind: StatefulSet
      name: yb-tserver
      namespace: yb-demo
```

## Step 6: Verify and Connect

```bash
# Check all pods
kubectl get pods -n yb-demo

# Access YugabyteDB Admin UI
kubectl port-forward svc/yb-master-ui 7000:7000 -n yb-demo
# Open http://localhost:7000

# Connect via YSQL (PostgreSQL-compatible)
kubectl port-forward svc/yb-tservers 5433:5433 -n yb-demo
psql -h localhost -p 5433 -U yugabyte

# Check cluster health via yb-admin
kubectl exec -n yb-demo yb-master-0 -- \
  /home/yugabyte/bin/yb-admin --master_addresses yb-masters.yb-demo.svc.cluster.local:7100 \
  list_all_masters
```

## Best Practices

- Set `replication_factor: "3"` and run at least 3 tserver pods on separate nodes for fault tolerance.
- Use SSD storage (`premium-ssd` StorageClass) - YugabyteDB uses RocksDB which benefits greatly from low-latency storage.
- Tune `yb_num_shards_per_tserver` based on your CPU count - typically 4-8 shards per CPU.
- Enable the Admin UI (`port 7000`) and monitor tablet distribution, leader placement, and compaction metrics.
- Use read replicas (`tserver.readReplica`) for geo-distribution if you have users in multiple regions.

## Conclusion

YugabyteDB deployed through Flux CD provides a cloud-native distributed SQL database with PostgreSQL compatibility and automatic geo-distribution capabilities. The Helm chart's rich values API exposes all YugabyteDB tuning parameters as GitOps-managed configuration. From single-region deployments to globally distributed clusters, Flux ensures your YugabyteDB topology is consistently applied and version-controlled across environments.

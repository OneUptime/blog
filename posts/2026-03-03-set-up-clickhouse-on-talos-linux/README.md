# How to Set Up ClickHouse on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, ClickHouse, Kubernetes, Analytics, OLAP, Database, DevOps

Description: Deploy ClickHouse columnar analytics database on Talos Linux with the ClickHouse Operator for high-performance analytical queries.

---

ClickHouse is an open-source columnar database built for online analytical processing (OLAP). It processes billions of rows per second, making it a top choice for real-time analytics, log analysis, and time-series data. Deploying ClickHouse on Talos Linux pairs a high-performance analytics engine with a secure, immutable Kubernetes OS.

This guide covers deploying ClickHouse on Talos Linux using both manual StatefulSet approaches and the ClickHouse Operator for automated cluster management.

## Why ClickHouse on Talos Linux

ClickHouse is resource-intensive and benefits from predictable system behavior. Talos Linux delivers that by removing unnecessary OS components and providing a consistent runtime environment. The immutable nature means your ClickHouse nodes will not suffer from configuration drift or unexpected system changes that could affect query performance.

## Prerequisites

- Talos Linux cluster with at least two worker nodes
- Worker nodes with 8GB+ RAM and SSD storage
- `kubectl` and `talosctl` installed
- A StorageClass that provides fast I/O

## Step 1: Prepare Talos Linux

ClickHouse works best with certain kernel settings:

```yaml
# talos-clickhouse-patch.yaml
machine:
  sysctls:
    # ClickHouse opens many files during queries
    vm.max_map_count: "262144"
    net.core.somaxconn: "4096"
    net.ipv4.tcp_fin_timeout: "30"
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/clickhouse-data
```

```bash
talosctl apply-config --nodes 10.0.0.2,10.0.0.3 \
  --file talos-clickhouse-patch.yaml
```

## Step 2: Install the ClickHouse Operator

The Altinity ClickHouse Operator is the standard way to run ClickHouse on Kubernetes:

```bash
# Install the ClickHouse Operator
kubectl apply -f https://raw.githubusercontent.com/Altinity/clickhouse-operator/master/deploy/operator/clickhouse-operator-install-bundle.yaml

# Verify the operator is running
kubectl get pods -n kube-system | grep clickhouse-operator
```

## Step 3: Deploy ClickHouse Cluster

```yaml
# clickhouse-cluster.yaml
apiVersion: "clickhouse.altinity.com/v1"
kind: "ClickHouseInstallation"
metadata:
  name: clickhouse-prod
  namespace: default
spec:
  defaults:
    templates:
      dataVolumeClaimTemplate: data-volume
      logVolumeClaimTemplate: log-volume
  configuration:
    clusters:
      - name: "analytics"
        layout:
          shardsCount: 2
          replicasCount: 2
        templates:
          podTemplate: clickhouse-pod
    zookeeper:
      nodes:
        - host: zookeeper.zookeeper.svc.cluster.local
          port: 2181
    users:
      # Define application users
      analytics_user/password: "analytics-password"
      analytics_user/networks/ip: "::/0"
      analytics_user/profile: default
      analytics_user/quota: default
    settings:
      # Global settings
      max_memory_usage: "10000000000"
      max_concurrent_queries: "100"
      max_execution_time: "300"
    profiles:
      default/max_memory_usage: "10000000000"
      default/max_execution_time: "300"
  templates:
    podTemplates:
      - name: clickhouse-pod
        spec:
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:24.1
              resources:
                requests:
                  memory: "4Gi"
                  cpu: "2000m"
                limits:
                  memory: "8Gi"
                  cpu: "4000m"
    volumeClaimTemplates:
      - name: data-volume
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: local-path
          resources:
            requests:
              storage: 200Gi
      - name: log-volume
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: local-path
          resources:
            requests:
              storage: 10Gi
```

## Step 4: Deploy ZooKeeper for Distributed DDL

ClickHouse clusters use ZooKeeper (or ClickHouse Keeper) for distributed coordination:

```yaml
# zookeeper.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: zookeeper
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
  namespace: zookeeper
spec:
  serviceName: zookeeper
  replicas: 3
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      containers:
        - name: zookeeper
          image: zookeeper:3.9
          ports:
            - containerPort: 2181
              name: client
            - containerPort: 2888
              name: server
            - containerPort: 3888
              name: leader-election
          env:
            - name: ZOO_MY_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: ZOO_SERVERS
              value: "server.1=zookeeper-0.zookeeper:2888:3888;2181 server.2=zookeeper-1.zookeeper:2888:3888;2181 server.3=zookeeper-2.zookeeper:2888:3888;2181"
          volumeMounts:
            - name: zk-data
              mountPath: /data
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
  volumeClaimTemplates:
    - metadata:
        name: zk-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: zookeeper
  namespace: zookeeper
spec:
  selector:
    app: zookeeper
  ports:
    - port: 2181
      targetPort: 2181
  clusterIP: None
```

Alternatively, use ClickHouse Keeper which is a built-in alternative:

```yaml
# Add to the ClickHouseInstallation spec
configuration:
  settings:
    keeper_server/tcp_port: "9181"
    keeper_server/server_id: "1"
    keeper_server/coordination_settings/operation_timeout_ms: "10000"
```

## Step 5: Apply and Verify

```bash
# Deploy ZooKeeper first
kubectl apply -f zookeeper.yaml

# Wait for ZooKeeper
kubectl rollout status statefulset/zookeeper -n zookeeper

# Deploy ClickHouse cluster
kubectl apply -f clickhouse-cluster.yaml

# Check ClickHouse pods
kubectl get pods -l clickhouse.altinity.com/chi=clickhouse-prod

# View the ClickHouse installation status
kubectl get chi clickhouse-prod
```

## Step 6: Connect and Create Tables

```bash
# Connect to ClickHouse
kubectl exec -it chi-clickhouse-prod-analytics-0-0-0 -- \
  clickhouse-client --user analytics_user --password analytics-password
```

```sql
-- Create a distributed table for log analytics
CREATE TABLE logs_local ON CLUSTER analytics (
    timestamp DateTime,
    level String,
    service String,
    message String,
    trace_id String
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/logs', '{replica}')
ORDER BY (service, timestamp)
PARTITION BY toYYYYMM(timestamp)
TTL timestamp + INTERVAL 90 DAY;

-- Create the distributed table that queries across shards
CREATE TABLE logs ON CLUSTER analytics AS logs_local
ENGINE = Distributed(analytics, default, logs_local, rand());

-- Insert test data
INSERT INTO logs VALUES
    (now(), 'INFO', 'api-server', 'Request processed', 'abc-123'),
    (now(), 'ERROR', 'auth-service', 'Token expired', 'def-456');

-- Query across shards
SELECT service, count() as cnt, level
FROM logs
GROUP BY service, level
ORDER BY cnt DESC;
```

## Monitoring ClickHouse

ClickHouse exposes metrics through its system tables and HTTP interface:

```bash
# Check query performance
kubectl exec -it chi-clickhouse-prod-analytics-0-0-0 -- \
  clickhouse-client -q "SELECT query, elapsed, read_rows, memory_usage FROM system.processes"

# Check cluster status
kubectl exec -it chi-clickhouse-prod-analytics-0-0-0 -- \
  clickhouse-client -q "SELECT * FROM system.clusters"

# Check replication status
kubectl exec -it chi-clickhouse-prod-analytics-0-0-0 -- \
  clickhouse-client -q "SELECT database, table, is_leader, total_replicas, active_replicas FROM system.replicas"
```

## Performance Tuning

For optimal ClickHouse performance on Talos Linux:

- Use SSDs exclusively for ClickHouse data volumes
- Set `max_memory_usage` to about 80% of the container memory limit
- Configure appropriate `max_threads` based on CPU limits
- Use materialized views for pre-aggregating frequently queried data
- Partition tables by time to enable efficient data lifecycle management

## Conclusion

ClickHouse on Talos Linux is an excellent choice for building analytics infrastructure. The ClickHouse Operator handles the complexity of managing sharded, replicated clusters while Talos Linux provides a secure and consistent runtime environment. Whether you are processing logs, metrics, or business analytics data, this combination delivers the query performance ClickHouse is known for with the operational simplicity of an immutable OS. Start with a small cluster, tune based on your query patterns, and scale horizontally as your data volume grows.

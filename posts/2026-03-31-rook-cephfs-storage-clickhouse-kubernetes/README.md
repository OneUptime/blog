# How to Set Up CephFS Storage for ClickHouse on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ClickHouse, CephFS, Kubernetes, Analytics

Description: Learn how to configure CephFS shared storage for ClickHouse on Kubernetes, enabling distributed query execution and shared data access across ClickHouse instances.

---

ClickHouse is a columnar analytical database optimized for fast aggregation queries over large datasets. When running ClickHouse on Kubernetes with Rook-Ceph, CephFS shared storage enables ClickHouse's distributed mode where multiple instances can access the same data directories.

## Why CephFS for ClickHouse

ClickHouse in distributed mode can use shared storage for:
- **Shared replicas** - Multiple ClickHouse instances reading the same data
- **Backup storage** - CephFS as a backup destination accessible from all nodes
- **DDL synchronization** - Sharing DDL files across a cluster
- **Detached parts** - Temporarily detached table parts accessible to all nodes

Block storage (RBD) is also valid for single-node ClickHouse deployments.

## Setting Up CephFS for ClickHouse

Create a CephFS filesystem:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: clickhouse-fs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: data0
      replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs-clickhouse
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: clickhouse-fs
  pool: clickhouse-fs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Deploying ClickHouse with the Altinity Operator

Use the Altinity ClickHouse Operator:

```yaml
apiVersion: clickhouse.altinity.com/v1
kind: ClickHouseInstallation
metadata:
  name: clickhouse
  namespace: analytics
spec:
  defaults:
    templates:
      dataVolumeClaimTemplate: clickhouse-storage
      podTemplate: pod-template
  configuration:
    clusters:
      - name: cluster1
        layout:
          shardsCount: 2
          replicasCount: 2
  templates:
    volumeClaimTemplates:
      - name: clickhouse-storage
        spec:
          accessModes:
            - ReadWriteMany
          resources:
            requests:
              storage: 200Gi
          storageClassName: rook-cephfs-clickhouse
    podTemplates:
      - name: pod-template
        spec:
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:24.1
              volumeMounts:
                - name: clickhouse-storage
                  mountPath: /var/lib/clickhouse
```

## ClickHouse Configuration for CephFS

Tune ClickHouse for shared filesystem storage:

```xml
<!-- config.d/storage.xml -->
<clickhouse>
  <storage_configuration>
    <disks>
      <cephfs>
        <type>local</type>
        <path>/var/lib/clickhouse/</path>
      </cephfs>
    </disks>
    <policies>
      <default>
        <volumes>
          <main>
            <disk>cephfs</disk>
          </main>
        </volumes>
      </default>
    </policies>
  </storage_configuration>
</clickhouse>
```

Configure memory settings for analytical queries in `users.d/profiles.xml`:

```xml
<!-- users.d/profiles.xml -->
<clickhouse>
  <profiles>
    <default>
      <max_memory_usage>10000000000</max_memory_usage>
      <max_bytes_before_external_group_by>5000000000</max_bytes_before_external_group_by>
    </default>
  </profiles>
</clickhouse>
```

## Querying Across Shards

With CephFS shared storage, distributed tables work across all shards:

```sql
-- Create local table on each shard
CREATE TABLE events_local ON CLUSTER cluster1 (
  timestamp DateTime,
  user_id UInt64,
  event_type String
) ENGINE = MergeTree()
ORDER BY (timestamp, user_id);

-- Create distributed table
CREATE TABLE events ON CLUSTER cluster1 AS events_local
ENGINE = Distributed(cluster1, default, events_local, rand());

-- Query all shards transparently
SELECT count(), event_type
FROM events
WHERE timestamp >= now() - INTERVAL 1 DAY
GROUP BY event_type;
```

## Summary

CephFS provides the shared ReadWriteMany storage that enables ClickHouse distributed mode on Kubernetes. Using the Altinity Operator with a CephFS StorageClass allows all ClickHouse pods to access the same data directories. For analytical workloads, the high sequential read throughput of CephFS backed by SSDs delivers the performance ClickHouse needs for fast aggregation queries over large datasets.

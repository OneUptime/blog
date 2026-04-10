# How to Set Up Ceph RBD Storage for Cassandra on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cassandra, RBD, Kubernetes, Database

Description: Learn how to configure Ceph RBD block storage for Apache Cassandra on Kubernetes, including StorageClass setup, compaction tuning, and deploying with the Cassandra Operator.

---

Apache Cassandra is a distributed database optimized for high write throughput and low-latency reads. Running Cassandra on Kubernetes with Rook-Ceph RBD provides durable, per-node storage that survives pod rescheduling while maintaining Cassandra's distributed data model.

## Cassandra Storage Requirements

Cassandra stores SSTables, commit logs, and hints on local storage. For optimal performance:
- Data directory and commit log should ideally be on separate devices
- Compaction requires 2x the space of the largest SSTable on the data directory
- Sequential read performance matters for compaction; RBD on SSDs excels here

## Creating Dedicated Pools

Create separate pools for data and commit logs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create cassandra-data 64 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create cassandra-commitlog 32 32

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init cassandra-data

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init cassandra-commitlog
```

## Creating StorageClasses

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-cassandra-data
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: cassandra-data
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Deploying Cassandra with the K8ssandra Operator

K8ssandra is the production-grade Kubernetes operator for Cassandra:

```yaml
apiVersion: k8ssandra.io/v1alpha1
kind: K8ssandraCluster
metadata:
  name: cassandra
  namespace: databases
spec:
  cassandra:
    serverVersion: "4.1.3"
    datacenters:
      - metadata:
          name: dc1
        size: 3
        storageConfig:
          cassandraDataVolumeClaimSpec:
            storageClassName: rook-ceph-cassandra-data
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 200Gi
        config:
          cassandraYaml:
            num_tokens: 16
            compaction_throughput_mb_per_sec: 64
            concurrent_compactors: 2
```

## Cassandra Configuration for RBD

Tune Cassandra for RBD storage:

```yaml
cassandraYaml:
  # Commit log sync settings
  commitlog_sync: periodic
  commitlog_sync_period_in_ms: 10000
  # Compaction settings
  compaction_throughput_mb_per_sec: 64
  concurrent_compactors: 2
  # Disable disk failure policy that could kill the node
  disk_failure_policy: best_effort
```

## Monitoring Cassandra Storage Metrics

```bash
# Check compaction status
kubectl -n databases exec -it cassandra-dc1-default-sts-0 -- \
  nodetool compactionstats

# Check disk usage per keyspace
kubectl -n databases exec -it cassandra-dc1-default-sts-0 -- \
  nodetool tablestats | grep "Space used"

# Flush memtables to disk
kubectl -n databases exec -it cassandra-dc1-default-sts-0 -- \
  nodetool flush
```

## Summary

Rook-Ceph RBD provides the per-node block storage that Cassandra requires for SSTable data and commit logs. K8ssandra operator simplifies cluster deployment and uses Rook StorageClasses for volume provisioning. Separating data and commit log pools, tuning compaction throughput, and using `best_effort` disk failure policy ensures Cassandra remains operational during brief I/O hiccups typical of network-attached block storage.

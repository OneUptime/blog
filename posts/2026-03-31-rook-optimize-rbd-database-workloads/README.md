# How to Optimize RBD for Database Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Database, Performance

Description: Optimize Ceph RBD block storage in Rook for database workloads by configuring object size, caching, IOPS reservation, and pool placement on NVMe OSDs.

---

## Database I/O Patterns

Database workloads generate small random I/O with strict latency requirements. MySQL InnoDB typically uses 16 KB pages, PostgreSQL uses 8 KB, and most databases require strong write ordering guarantees. RBD must be configured to deliver consistent low-latency IOPS rather than peak throughput.

## NVMe OSD Pool

Create a dedicated pool on NVMe-backed OSDs for database volumes:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: db-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  deviceClass: nvme
  compressionMode: none
```

Disable compression for databases - it adds latency without benefit since database files contain mixed content:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set db-pool compression_mode none
```

## StorageClass for Database PVCs

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd-database
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: db-pool
  imageFormat: "2"
  imageFeatures: layering,fast-diff,object-map,deep-flatten
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## RBD Object Size Tuning

Reduce the RBD object size from the default 4 MB to limit write amplification for small random I/O. Smaller objects mean each RADOS write touches less data, at the cost of more objects in the cluster. For PostgreSQL (8 KB pages):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create db-pool/pg-data \
    --size 100G \
    --object-size 65536
```

For MySQL InnoDB (16 KB pages):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create db-pool/mysql-data \
    --size 200G \
    --object-size 131072
```

## Exclusive Lock and Journaling

Databases require exclusive lock to prevent data corruption from concurrent access:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd feature enable db-pool/mysql-data exclusive-lock
```

Disable journaling for databases that manage their own write-ahead log:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd feature disable db-pool/mysql-data journaling
```

## QoS IOPS Limiting

Use Ceph's QoS to cap maximum IOPS per database volume, preventing any single image from monopolizing cluster I/O:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set db-pool/mysql-data rbd_qos_iops_limit 10000

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set db-pool/mysql-data rbd_qos_iops_burst 15000
```

## Benchmarking Database I/O

Simulate database random I/O with fio:

```bash
fio --name=db-test --ioengine=libaio --direct=1 --rw=randrw \
    --bs=16k --size=10g --iodepth=64 --numjobs=4 \
    --rwmixread=70 --group_reporting \
    --filename=/dev/rbd0
```

Aim for sub-millisecond average latency on NVMe OSDs.

## Summary

RBD for databases requires NVMe-backed pools, reduced object size to limit write amplification, exclusive lock for write integrity, and QoS IOPS limits to prevent noisy neighbor interference. Disabling compression and journaling eliminates unnecessary overhead for databases that handle their own durability mechanisms.

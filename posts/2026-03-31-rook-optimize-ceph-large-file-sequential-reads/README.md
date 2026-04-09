# How to Optimize Ceph for Large File Sequential Reads (ML Training)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Machine Learning, Optimization

Description: Tune Ceph object and filesystem settings to maximize sequential read throughput for large ML training files like datasets, TFRecords, and model weights.

---

## Overview

ML training workloads read large files sequentially at high throughput. The default Ceph configuration is tuned for mixed random workloads. Adjusting readahead, object size, and OSD parameters can significantly improve sequential read performance.

## Benchmark Baseline Performance

Start by measuring current sequential read performance:

```bash
# Using fio against an RBD volume
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  fio --name=seq-read \
  --filename=/dev/rbd0 \
  --rw=read \
  --bs=1M \
  --numjobs=4 \
  --runtime=60 \
  --group_reporting

# Using rados bench for object storage
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rados bench -p ml-datasets 60 seq
```

## Tune Read-Ahead for CephFS

Large sequential reads benefit from aggressive readahead:

```bash
# Set readahead to 64MB
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set client client_readahead_max_bytes 67108864

# Increase the number of in-flight ops
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set client objecter_inflight_ops 24576

# Set read-ahead for specific filesystem
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set client.ml_user client_readahead_max_bytes 134217728
```

## Optimize Object Size for Large Files

When creating RBD images for large datasets, use a larger object size:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd create --size 1024G --object-size 32M ml-datasets/training-data
```

## Tune OSD Parameters

Increase OSD read parallelism:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_threads_per_shard 4

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd osd_mclock_scheduler_client_res 50.0
```

## Configure Pool Parameters

Set larger pg_num for high-bandwidth pools:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd pool set ml-datasets pg_num 256

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd pool set ml-datasets pgp_num 256
```

## Mount Options for CephFS

Set kernel mount options for sequential read optimization:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs-ml-seq
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  kernelMountOptions: "rasize=8388608,noatime,nodiratime"
  fuseMountOptions: "default_permissions"
```

## Summary

Optimizing Ceph for sequential ML training reads involves increasing readahead buffers, using larger object sizes for large files, tuning OSD read thread pools, and setting optimal CephFS mount options. Together these changes can double or triple throughput for large file sequential workloads compared to default Ceph settings.

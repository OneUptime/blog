# How to Size a Ceph Cluster for High-IOPS Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, IOPS, NVMe, Storage, Capacity Planning

Description: Learn how to size and tune a Rook-Ceph cluster for high-IOPS workloads like databases and transactional applications using NVMe and SSD drives.

---

## Overview

High-IOPS workloads - databases, OLTP systems, message queues, and key-value stores - require Ceph clusters built for low latency random I/O rather than sequential bandwidth. The key factors are drive IOPS, replication latency, and network round-trip time. NVMe SSDs are the preferred OSD media for IOPS-intensive Ceph deployments.

## IOPS Calculation

A single NVMe drive delivers approximately 500K-1M IOPS (4K random read). However, Ceph replication means each write goes to 3 OSDs, multiplying the IOPS requirement:

```yaml
Target: 500K write IOPS from clients
Each write = 3 OSD writes (3x replication)
Total OSD IOPS needed: 500K * 3 = 1.5M IOPS
Per-NVMe capacity: ~500K IOPS
NVMe OSDs needed: 1.5M / 500K = 3 NVMe OSDs minimum

For reads (no replication overhead):
Target 1M read IOPS / 500K per NVMe = 2 NVMe OSDs minimum
```

## Hardware Selection for IOPS

```yaml
NVMe drives: PCIe Gen4 x4 (Samsung 990 Pro, WD SN850X, etc.)
Per-drive IOPS: 500K-1.2M (4K random read)
Per-drive latency: 0.1-0.2ms
CPU: High single-core performance + many cores (AMD EPYC, Intel Xeon)
RAM: 4-8GB per NVMe OSD
Network: 25-100GbE RDMA (RoCE) for sub-millisecond cluster latency
```

## NVMe OSD Configuration in Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    nodes:
    - name: "nvme-node-01"
      devices:
      - name: "nvme0n1"
      - name: "nvme1n1"
      - name: "nvme2n1"
      - name: "nvme3n1"
    config:
      osdsPerDevice: "1"
      storeType: bluestore
```

## Pool Configuration for Low Latency

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: iops-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    compression_mode: none
```

## Tuning for Low Latency I/O

```yaml
# ConfigMap for IOPS-optimized OSD settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    osd_op_num_threads_per_shard = 4
    osd_op_num_shards = 16
    bluestore_cache_size_hdd = 0
    bluestore_cache_size_ssd = 3221225472
    osd_memory_target = 8589934592
    bluestore_min_alloc_size_ssd = 4096
```

## StorageClass with ReadWriteOnce for Databases

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-nvme-iops
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: iops-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/fstype: xfs
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Use `xfs` for database workloads as it performs better than `ext4` for concurrent random I/O.

## Measuring IOPS

```bash
# Run fio IOPS benchmark from a pod using the storage class
kubectl run fio-test --image=nixery.dev/fio --restart=Never -- \
  fio --name=randread \
    --filename=/data/testfile \
    --bs=4k --iodepth=128 --rw=randread \
    --ioengine=libaio --direct=1 \
    --size=10G --numjobs=4 \
    --group_reporting

# Check results
kubectl logs fio-test
```

## Latency Monitoring

```bash
# Check OSD latency percentiles
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd perf

# Watch real-time latency
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph --watch-debug
```

## Summary

High-IOPS Ceph clusters require NVMe OSDs, RDMA-capable networking, and careful BlueStore cache tuning. For database workloads targeting hundreds of thousands of IOPS, start with 4-8 NVMe drives per node across at least 3 nodes, configure the BlueStore SSD cache aggressively, and use XFS-formatted volumes. Monitor latency percentiles via `ceph osd perf` to verify the cluster is meeting your application's latency SLAs.

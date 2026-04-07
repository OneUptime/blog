# How to Size a Ceph Cluster for High-Throughput Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Throughput, Storage, Capacity Planning

Description: Learn how to size and configure a Rook-Ceph cluster optimized for high-throughput workloads like video streaming, data pipelines, and backup targets.

---

## Overview

High-throughput workloads such as video ingest, ML training data pipelines, and backup targets require Ceph clusters designed for maximum sequential read and write bandwidth rather than low latency. The key variables are drive type, network bandwidth, and the number of OSDs presenting concurrent I/O paths to clients.

## Throughput Targets and OSD Math

A single SATA HDD delivers roughly 200MB/s sequential throughput. A Ceph cluster's aggregate throughput scales roughly linearly with OSD count (assuming the network is not the bottleneck):

```yaml
Target: 10GB/s aggregate write throughput
Per-HDD sequential write: ~150MB/s (conservative)
OSDs needed: 10,000MB/s / 150MB/s = 67 OSDs minimum

With 3x replication, each write is amplified 3x:
Effective OSD throughput = single drive throughput / 3
Adjusted OSDs needed: 10,000 * 3 / 150 = 200 OSDs
```

For NVMe drives (3GB/s each):

```text
OSDs needed for 10GB/s: 10,000 * 3 / 3,000 = 10 NVMe OSDs
```

## Hardware Selection for Throughput

```yaml
# For HDD-based high-throughput cluster
Drives: 7200 RPM SATA or SAS (16TB-20TB each)
Per-node: 12-24 drives
CPU: High core count to handle parallel I/O (32+ cores)
RAM: 8GB per OSD (for BlueStore cache and async I/O)
Network: 25GbE per node minimum, 100GbE preferred
```

## Disabling Replication Overhead with Erasure Coding

For write-once workloads (backups, cold archives), EC reduces write amplification:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: throughput-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  parameters:
    compression_mode: none
    bulk: "true"
```

## Network Sizing

The public network must handle aggregate client throughput. For 10GB/s:

```text
10GB/s = 80Gbps
With 10 nodes: 8Gbps per node -> 10GbE per node is the bottleneck
Use 25GbE or 100GbE per node for headroom
```

Configure Rook to use dedicated networks:

```yaml
spec:
  network:
    selectors:
      public: "eth1"
      cluster: "eth2"
```

## OSD Configuration for Throughput

Increase async I/O queue depth for sequential workloads:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [osd]
    osd_op_num_threads_per_shard = 2
    osd_op_num_shards = 8
    osd_max_write_size = 90
    osd_client_message_size_cap = 524288000
```

## CephFS for Parallel Streaming

For video and ML pipelines, CephFS with multiple active MDS instances provides parallel namespace access:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: throughput-fs
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
    activeCount: 4    # Multiple active MDS for parallel access
    activeStandby: true
```

## Measuring Throughput

```bash
# Benchmark with fio
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  fio --name=throughput-test \
    --filename=/mnt/cephfs/testfile \
    --bs=1M --iodepth=64 --rw=write \
    --ioengine=libaio --direct=1 \
    --size=10G --numjobs=8

# Object storage throughput benchmark
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  rados -p throughput-pool bench 60 write \
    -b 4M --max-objects=1000
```

## Summary

Sizing for high throughput is primarily a function of OSD count, drive sequential speed, and network bandwidth. HDDs remain cost-effective for throughput-heavy workloads like backups and streaming, while NVMe dramatically reduces the OSD count needed for the same bandwidth. Configure dedicated public and cluster networks, tune OSD thread counts, and use erasure coding for write-once data to maximize throughput efficiency in Rook-Ceph.

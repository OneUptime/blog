# How to Configure CephFS for High-Throughput Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Performance, Throughput

Description: Configure CephFS in Rook for high-throughput workloads by scaling OSDs, tuning striping, increasing MDS parallelism, and optimizing network configuration.

---

## High-Throughput Workload Requirements

High-throughput workloads - HPC computing, data lake ingestion, video transcoding pipelines - demand the maximum aggregate I/O bandwidth from the storage cluster. Achieving this requires attention to every layer: OSDs, networking, MDS, and client configuration.

## OSD Scaling and Placement

Throughput scales with the number of OSDs. Each OSD can typically deliver 100-200 MB/s on HDD or 500 MB/s+ on NVMe. For 10 GB/s aggregate throughput, plan for at least 50 HDD OSDs or 20 NVMe OSDs.

Spread OSDs across many nodes to maximize network parallelism:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    storageClassDeviceSets:
      - name: nvme-set
        count: 20
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              resources:
                requests:
                  storage: 2Ti
              storageClassName: nvme-local
              volumeMode: Block
              accessModes:
                - ReadWriteOnce
```

## Striping Configuration

Stripe data across many OSDs to use all available bandwidth:

```bash
setfattr -n ceph.dir.layout.stripe_unit -v 1048576 /mnt/cephfs/hpc-data
setfattr -n ceph.dir.layout.stripe_count -v 16 /mnt/cephfs/hpc-data
setfattr -n ceph.dir.layout.object_size -v 16777216 /mnt/cephfs/hpc-data
```

With 16 stripes, each file write is split across 16 objects on different OSDs.

## Multiple Active MDS

For high-throughput workloads with many files, use multiple active MDS instances with subtree pinning:

```yaml
metadataServer:
  activeCount: 4
  activeStandby: true
  resources:
    requests:
      memory: "8Gi"
      cpu: "4"
    limits:
      memory: "16Gi"
```

Pin subtrees to specific MDS ranks:

```bash
setfattr -n ceph.dir.pin -v 0 /mnt/cephfs/hpc-data/job1
setfattr -n ceph.dir.pin -v 1 /mnt/cephfs/hpc-data/job2
setfattr -n ceph.dir.pin -v 2 /mnt/cephfs/hpc-data/job3
```

## Network Configuration

Use a dedicated 25 GbE or 100 GbE network for the Ceph cluster:

```yaml
spec:
  network:
    provider: host
    addressRanges:
      public:
        - "192.168.1.0/24"
      cluster:
        - "10.0.0.0/24"
```

Enable jumbo frames on the Ceph network interfaces to reduce CPU overhead:

```bash
ip link set eth1 mtu 9000
ip link set eth2 mtu 9000
```

## Client Tuning

Increase client write buffer size for high-throughput writes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_oc_max_dirty 268435456

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_oc_size 536870912
```

## Measuring Throughput

Benchmark with multiple parallel fio jobs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  fio --name=par-write --ioengine=libaio --rw=write \
      --bs=4m --size=40g --iodepth=32 --numjobs=16 \
      --group_reporting \
      --filename=/mnt/cephfs/hpc-data/bench
```

Monitor aggregate OSD throughput:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

## Summary

High-throughput CephFS performance requires a large number of OSDs, aggressive striping across many OSD objects, a high-speed dedicated network, and multiple active MDS instances for workloads with many files. Tuning client write buffers and using subtree pinning ensures that no single MDS or OSD becomes the bottleneck.

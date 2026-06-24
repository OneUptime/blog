# How to Optimize CephFS for Sequential Access Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Performance, Optimization

Description: Optimize CephFS in Rook for sequential access workloads by tuning readahead, object layout, and OSD journal settings for maximum streaming throughput.

---

## Sequential Access in CephFS

Sequential access patterns - scanning large datasets, streaming video, backup/restore operations - are characterized by reading or writing data in linear order from start to finish. CephFS handles these well when configured correctly, but default settings favor balanced workloads rather than peak sequential throughput.

## Client Readahead Tuning

The most impactful setting for sequential reads is client readahead. Increase it to allow the client to prefetch more data:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_readahead_max_bytes 134217728

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_readahead_min 4194304
```

For kernel-mounted CephFS, set readahead via the BDI (Backing Device Info) interface after mounting:

```bash
# Find the BDI identifier for your CephFS mount
BDI_ID=$(mountpoint -d /mnt/cephfs)
echo 131072 > /sys/class/bdi/${BDI_ID}/read_ahead_kb
```

## Object Layout Optimization

Align the CephFS object size with your I/O size. For 1 MB sequential I/O:

```bash
# Set layout on target directory
setfattr -n ceph.dir.layout.object_size -v 33554432 /mnt/cephfs/sequential-data
setfattr -n ceph.dir.layout.stripe_count -v 1 /mnt/cephfs/sequential-data
```

Using stripe_count=1 keeps sequential data in contiguous object ranges per OSD, improving cache locality.

## OSD-Level Tuning

BlueStore sequential write performance benefits from increased cache size:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_cache_size_ssd 4294967296

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_cache_size_hdd 1073741824
```

Configure the OSD operation queue scheduler for better throughput:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_queue mclock_scheduler
```

## Network Optimization

Sequential workloads generate sustained high bandwidth. Verify the OSD network is not a bottleneck:

```bash
# Check OSD commit and apply latency to identify slow nodes
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

If using multiple network interfaces, configure Ceph to use a dedicated cluster network:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    provider: host
    selectors:
      public: "eth0"
      cluster: "eth1"
```

## Rook CephFilesystem Configuration

For sequential workloads, a single active MDS is usually sufficient. Focus resources on OSD nodes:

```yaml
metadataServer:
  activeCount: 1
  activeStandby: true
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
```

## Benchmarking Sequential Throughput

Test before and after tuning with fio from a pod that has CephFS mounted (the rook-ceph-tools pod does not mount CephFS by default):

```bash
# Run fio from a pod with a CephFS PVC mounted at /mnt/cephfs
kubectl exec -it <your-cephfs-pod> -- \
  fio --name=seq-write --ioengine=libaio --rw=write \
      --bs=4m --size=20g --iodepth=16 \
      --filename=/mnt/cephfs/bench/seq-test
```

Monitor OSD performance during the test from the tools pod:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch ceph osd perf
```

## Summary

Sequential access optimization in CephFS focuses on three levers: large client readahead to pipeline prefetch requests, object layout alignment to avoid object boundary overhead, and increased BlueStore cache to absorb burst writes. Combined with a dedicated cluster network, these changes can double sequential throughput compared to defaults.

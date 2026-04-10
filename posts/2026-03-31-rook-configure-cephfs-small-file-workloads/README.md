# How to Configure CephFS for Small File Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Performance, Storage

Description: Configure CephFS in Rook to handle small file workloads efficiently by tuning MDS cache, directory fragmentation, and client-side settings.

---

## Small File Challenges in CephFS

Workloads involving millions of small files (logs, thumbnails, email archives, source trees) stress CephFS in specific ways. Each file creates an inode entry, and metadata operations like `stat`, `open`, and `readdir` become bottlenecks before I/O throughput does. The MDS is the key component to tune.

## MDS Cache Tuning

Increase the MDS cache memory so more inodes stay hot:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_memory_limit 8589934592
```

Tune the MDS journal size to reduce replay time after restarts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_log_max_segments 128
```

## Directory Fragmentation

Directories with more than 10,000 entries benefit from fragmentation. Directory fragmentation is enabled by default in modern Ceph. You can tune the split threshold:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_bal_split_size 10000
```

You can also pin specific large directories to a second MDS:

```bash
# Set directory pin to MDS rank 1
setfattr -n ceph.dir.pin -v 1 /mnt/cephfs/large-directory
```

## Client-Side Tuning

When mounting CephFS via kernel client, reduce metadata lookup overhead:

```bash
mount -t ceph mon-ip:6789:/ /mnt/cephfs \
  -o name=admin,secretfile=/etc/ceph/admin.secret,\
dcache,\
caps_max=65536
```

For CSI-mounted volumes, add mount options to your StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs-smallfile
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: cephfs
  pool: cephfs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
mountOptions:
  - dcache
  - caps_max=65536
```

## Filesystem Configuration

Set the minimum number of active replicas required for the data pool to accept I/O:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set cephfs-data0 min_size 2
```

Use SSD OSDs for the metadata pool to keep `stat` operations fast:

```yaml
metadataPool:
  replicated:
    size: 3
  deviceClass: ssd
```

## Benchmarking with mdtest

Test metadata throughput after tuning:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c \
  "mdtest -C -n 100000 -d /mnt/cephfs/bench -F"
```

Compare operations-per-second before and after tuning to validate improvements.

## Summary

Small file workloads in CephFS require aggressive MDS cache tuning, directory fragmentation for large directories, and client-side dcache settings. Placing the metadata pool on SSD-backed OSDs provides the biggest single performance improvement for inode-heavy workloads. Always benchmark with mdtest to confirm changes before deploying to production.

# How to Understand Ceph Data Striping (Object Size, Stripe Width, Stripe Count)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Striping, Performance, Storage, Kubernetes

Description: Learn how Ceph stripes large files across multiple objects using object size, stripe width, and stripe count parameters to maximize parallelism and throughput.

---

## Why Ceph Uses Data Striping

RADOS stores individual objects up to 4 MB in size by default. When an application writes a large file (e.g., a 1 GB RBD image block or a large CephFS file), Ceph automatically stripes the data across multiple RADOS objects. This enables parallel I/O across multiple OSDs, dramatically improving throughput for large sequential workloads.

## Three Striping Parameters

Ceph's striping model is controlled by three parameters defined per file layout or pool:

### 1. Object Size

The maximum size of each RADOS object. Data exceeding this size spills into the next object in the stripe. Default is 4 MB.

### 2. Stripe Unit

The size of data written to each object before moving to the next in the stripe set. Think of it as the I/O block size for a single stripe. Common values: 64 KB, 256 KB, 4 MB.

### 3. Stripe Count

The number of objects in a stripe set. Data is distributed round-robin across this many objects before wrapping back to the first.

## How Striping Works

For a file written with `stripe_unit=1MB`, `stripe_count=4`, `object_size=4MB`:

```text
Bytes 0-1MB    -> object 0, offset 0
Bytes 1-2MB    -> object 1, offset 0
Bytes 2-3MB    -> object 2, offset 0
Bytes 3-4MB    -> object 3, offset 0
Bytes 4-5MB    -> object 0, offset 1MB
...
```

All four objects land in different PGs and likely different OSDs, enabling 4x parallel throughput.

## Checking CephFS File Layout

CephFS exposes layout settings per file and directory:

```bash
kubectl exec -it rook-ceph-tools -n rook-ceph -- bash

# Check layout of a CephFS file (requires mounting the filesystem)
getfattr -n ceph.file.layout /mnt/cephfs/myfile.dat
```

Output:

```text
ceph.file.layout="stripe_unit=4194304 stripe_count=1 object_size=4194304 pool=cephfs-data"
```

## Setting CephFS File Layout

You can override the default striping for large files or directories:

```bash
# Set layout on a directory (applies to new files)
setfattr -n ceph.dir.layout.stripe_count -v 4 /mnt/cephfs/bigfiles/
setfattr -n ceph.dir.layout.stripe_unit -v 1048576 /mnt/cephfs/bigfiles/
setfattr -n ceph.dir.layout.object_size -v 4194304 /mnt/cephfs/bigfiles/
```

## RBD Striping

RBD images also support striping across multiple RADOS objects. Configure when creating an image:

```bash
# Create RBD image with striping
rbd create --size 10240 --stripe-unit 1M --stripe-count 4 replicapool/myimage

# View image striping info
rbd info replicapool/myimage
```

Output:

```text
rbd image 'myimage':
  size 10 GiB in 2560 objects
  order 22 (4 MiB objects)
  stripe unit: 1 MiB
  stripe count: 4
```

## Optimal Striping Configuration

For database workloads with random I/O, small stripe units (64 KB) with low stripe counts (1-2) minimize write amplification. For video streaming or bulk data, large stripe units (1 MB+) with higher stripe counts (4-8) maximize sequential throughput.

```bash
# Pool stripe width (erasure-coded pools only)
ceph osd pool get cephfs-data stripe_width
```

## Summary

Ceph data striping uses object size, stripe unit, and stripe count to distribute large files across multiple RADOS objects and OSDs in parallel. This enables horizontal I/O scaling without requiring a centralized striping coordinator. Understanding these parameters allows you to tune Rook-Ceph deployments for specific workloads - balancing throughput, latency, and write amplification based on whether your applications are optimized for random or sequential access patterns.

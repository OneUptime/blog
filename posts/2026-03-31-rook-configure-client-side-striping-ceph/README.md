# How to Configure Client-Side Striping in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Striping, Performance, Client, Storage

Description: Configure Ceph client-side object striping to distribute large objects across multiple OSDs and improve parallel read and write throughput.

---

Ceph supports client-side striping, which splits a large file or object into smaller stripe units distributed across multiple RADOS objects. This enables parallel I/O to multiple OSDs, significantly improving throughput for large sequential workloads.

## How Ceph Striping Works

Ceph's striping has three parameters:

- `object_size`: the size of each underlying RADOS object
- `stripe_unit`: the chunk size written per stripe
- `stripe_count`: how many objects form one stripe set

Data is written in stripe_unit chunks, cycling through stripe_count objects. Each object is stored independently in RADOS, which may map to a different OSD.

## Default Striping

By default, RBD images use:

- `object_size`: 4 MiB
- `stripe_unit`: 4 MiB (same as object size, effectively no striping)
- `stripe_count`: 1

## Enabling Striping for RBD Images

Create an RBD image with custom striping:

```bash
rbd create mypool/striped-image \
  --size 100G \
  --object-size 4M \
  --stripe-unit 1M \
  --stripe-count 4
```

This distributes writes across 4 RADOS objects in 1 MiB chunks, enabling 4x parallelism.

Verify the configuration:

```bash
rbd info mypool/striped-image
# stripe unit: 1 MiB
# stripe count: 4
```

## Striping in CephFS

CephFS applies striping at the file level. Configure it with `setfattr`:

```bash
# Set striping for new files in a directory
setfattr -n ceph.dir.layout.stripe_unit -v 1048576 /mnt/cephfs/bigfiles
setfattr -n ceph.dir.layout.stripe_count -v 4 /mnt/cephfs/bigfiles
setfattr -n ceph.dir.layout.object_size -v 4194304 /mnt/cephfs/bigfiles

# Verify
getfattr -n ceph.dir.layout /mnt/cephfs/bigfiles
```

Individual files inherit the directory layout at creation time.

## Striping with RADOS Directly

When writing objects directly via RADOS, use `libradosstriper` which implements striping on top of librados:

```c
#include <radosstriper/libradosstriper.h>

// Create a striper from an existing IoCtx
rados_striper_t striper;
rados_striper_create(ioctx, &striper);
rados_striper_set_object_layout_stripe_unit(striper, 1048576);   // 1 MiB
rados_striper_set_object_layout_stripe_count(striper, 4);
rados_striper_set_object_layout_object_size(striper, 4194304);   // 4 MiB

// Write data - the striper handles splitting across RADOS objects
rados_striper_write(striper, "myobject", data, data_len, 0);

rados_striper_destroy(striper);
```

## Performance Impact

Benchmark striped vs non-striped with `fio`:

```bash
# Write test on striped image
fio --name=write \
  --ioengine=rbd \
  --pool=mypool \
  --rbdname=striped-image \
  --rw=write \
  --bs=4M \
  --iodepth=16 \
  --size=10G
```

## When to Use Striping

- Large sequential workloads (video, analytics, backups)
- Machine learning training data reads
- High-throughput database bulk loads

Striping is less beneficial for small random I/O since the overhead of managing multiple RADOS objects outweighs the parallelism benefit.

## Summary

Ceph client-side striping improves throughput for large sequential workloads by distributing data across multiple RADOS objects and OSDs. Configure striping at image creation for RBD or at directory level for CephFS. Choose stripe_count based on the degree of parallelism available in your cluster, typically 4-8 for most workloads.

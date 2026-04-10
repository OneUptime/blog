# How to Set CephFS File Layouts in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Storage, Performance

Description: Learn how to configure CephFS file layouts in Rook to control how file data is striped across object storage, optimizing for specific workload patterns.

---

## What Are CephFS File Layouts

CephFS stores file data in RADOS objects. The file layout controls how data is divided and distributed across those objects. By adjusting layout parameters, you can optimize CephFS for different workloads - large streaming files benefit from wider stripes, while small random-access files benefit from compact, single-object storage.

Layout parameters include:
- `stripe_unit` - size of each stripe unit in bytes (default: 4 MB)
- `stripe_count` - number of consecutive stripe units before wrapping (default: 1)
- `object_size` - maximum size of each backing RADOS object (default: 4 MB)
- `pool` - which data pool the file data is written to

## Viewing the Default Layout

Use the Rook toolbox to check your filesystem's data pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs get myfs
```

To inspect the actual layout attributes, use `getfattr` from a client node where CephFS is mounted:

```bash
getfattr -n ceph.file.layout /mnt/cephfs/testfile
```

Output example:

```text
# file: /mnt/cephfs/testfile
ceph.file.layout="stripe_unit=4194304 stripe_count=1 object_size=4194304 pool=myfs-data0"
```

## Setting Layout on a Directory

Directory layouts are inherited by new files created within them. Set a layout on a directory to affect all future files:

```bash
# Set layout for large sequential files - 64MB object size, 4 stripe units
setfattr -n ceph.dir.layout.stripe_unit -v 4194304 /mnt/cephfs/large-files
setfattr -n ceph.dir.layout.stripe_count -v 4 /mnt/cephfs/large-files
setfattr -n ceph.dir.layout.object_size -v 67108864 /mnt/cephfs/large-files
```

Verify the directory layout:

```bash
getfattr -n ceph.dir.layout /mnt/cephfs/large-files
```

## Setting Layout on a File

File layouts can be set before any data is written to the file:

```bash
# Create an empty file and set its layout
touch /mnt/cephfs/myfile
setfattr -n ceph.file.layout.stripe_count -v 8 /mnt/cephfs/myfile
setfattr -n ceph.file.layout.object_size -v 134217728 /mnt/cephfs/myfile
# Now write data
dd if=/dev/zero of=/mnt/cephfs/myfile bs=1M count=512
```

Note: You cannot change a file's layout after data has been written. Plan layouts before writing.

## Directing Files to a Specific Data Pool

If your CephFilesystem has multiple data pools, you can direct specific directories to a particular pool:

```bash
# Direct a directory to use the 'hot-ssd' data pool
setfattr -n ceph.dir.layout.pool -v myfs-hot-ssd /mnt/cephfs/hot-data
```

This allows tiering within a single CephFS - critical data on SSDs, cold data on HDDs.

## Striping for High-Bandwidth Workloads

For large media files or HPC workloads:

```bash
# 8-way stripe across 4MB units = 32MB effective stripe width
setfattr -n ceph.dir.layout.stripe_unit -v 4194304 /mnt/cephfs/hpc
setfattr -n ceph.dir.layout.stripe_count -v 8 /mnt/cephfs/hpc
setfattr -n ceph.dir.layout.object_size -v 134217728 /mnt/cephfs/hpc
```

This spreads file data across 8 RADOS objects in parallel, increasing read/write throughput for large files.

## Summary

CephFS file layouts in Rook control data striping and pool placement at the directory or file level. Use `setfattr` to configure `stripe_unit`, `stripe_count`, `object_size`, and `pool` on directories so new files inherit optimal layouts for your workload. Wide stripes improve sequential throughput for large files, while default narrow layouts work well for small files. Layouts cannot be changed after data is written, so plan ahead.

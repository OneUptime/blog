# How to Configure Client Caching Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cache, Client, Performance, Storage

Description: Configure Ceph client-side RBD caching and libcephfs caching parameters to improve I/O performance for virtual machines and applications.

---

Ceph clients maintain a write-back cache to buffer I/O before sending it to the cluster. Tuning this cache significantly affects application performance and memory usage on client nodes.

## RBD Client Cache

The RBD client cache (librbd cache) is enabled by default. It buffers writes locally before flushing to the cluster, reducing round-trip latency.

### Basic Cache Configuration

```ini
[client]
rbd_cache = true
rbd_cache_size = 67108864          # 64 MiB total cache
rbd_cache_max_dirty = 50331648     # 48 MiB max dirty before flush
rbd_cache_target_dirty = 33554432  # 32 MiB target dirty level
rbd_cache_max_dirty_age = 1.0      # max age of dirty data in seconds
```

### Applying via ceph config

```bash
ceph config set client rbd_cache true
ceph config set client rbd_cache_size 67108864
ceph config set client rbd_cache_max_dirty 50331648
ceph config set client rbd_cache_target_dirty 33554432
```

### Disabling Cache for Database Workloads

Databases often do their own caching and prefer direct I/O with cache disabled:

```ini
[client.dbserver]
rbd_cache = false
```

Or per-image via image-level configuration override:

```bash
rbd config image set mypool/myimage rbd_cache false
```

## Writeback vs Writethrough Mode

When `rbd_cache_max_dirty` is 0, the cache operates in writethrough mode (writes go to the cluster before completing):

```ini
[client]
rbd_cache = true
rbd_cache_max_dirty = 0   # writethrough mode
```

Writethrough is safer (no data loss on client crash) but slower.

## libcephfs Client Cache

For CephFS mounts, the kernel client and libcephfs have separate caching:

```ini
[client]
client_cache_size = 16384        # number of inodes to cache
client_cache_mid = 0.75          # fraction of cache for "hot" inodes
fuse_big_writes = true
client_oc = true                 # object cache enabled
client_oc_size = 209715200       # 200 MiB object cache
client_oc_max_dirty = 104857600  # 100 MiB max dirty objects
```

### Kernel Mount Cache Options

```bash
mount -t ceph 192.168.1.10:/ /mnt/cephfs \
  -o name=myuser,secretfile=/etc/ceph/ceph.client.myuser.secret,\
rsize=65536,wsize=65536,readdir_max_bytes=1048576
```

## Checking Cache Stats

For RBD:

```bash
rbd perf image iostat mypool
```

For libcephfs, check the client's debugfs stats:

```bash
cat /sys/kernel/debug/ceph/*/mdsc
```

## Cache Flush Tuning

Force a client to flush its cache:

```bash
# Check client cache config via admin socket
ceph daemon /var/run/ceph/ceph-client.myapp.asok config show | grep rbd_cache

# Drop MDS metadata cache (for CephFS)
ceph tell mds.0 cache drop
```

## Summary

Ceph client caching provides significant performance improvements by buffering writes before sending them to the cluster. Tune `rbd_cache_size` and dirty thresholds based on your workload type: increase them for write-heavy workloads, use writethrough or disable cache for databases, and configure libcephfs inode and object caches for CephFS-mounted applications.

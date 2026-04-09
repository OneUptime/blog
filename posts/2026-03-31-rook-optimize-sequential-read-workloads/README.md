# How to Optimize Ceph for Sequential Read Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Storage, Optimization, Read

Description: Tune Ceph configuration for maximum sequential read throughput by optimizing readahead, object sizes, pool parameters, and client-side settings for streaming workloads.

---

## Sequential Read Workload Characteristics

Sequential read workloads - such as media streaming, backup restores, analytics scans, and log processing - benefit from different optimizations than random I/O workloads. The key is maximizing throughput by reading large contiguous chunks and minimizing the overhead of object lookups.

## Object Size Tuning

For large sequential reads, larger objects reduce the number of RADOS operations needed to read a file. Set the object size when creating pools:

```bash
# Create pool optimized for large sequential reads
ceph osd pool create streaming-data 128 128
```

For RBD images, set larger object size:

```bash
# Create RBD image with 32 MB objects (default is 4 MB)
rbd create streaming-pool/video-data --size 500G --object-size 33554432

# Check current object size
rbd info streaming-pool/video-data | grep object
```

## Enabling Read-Ahead for RBD

Configure read-ahead to prefetch data during sequential reads:

```bash
# Enable RBD read-ahead
ceph config set client rbd_readahead_trigger_requests 10
ceph config set client rbd_readahead_max_bytes 524288  # 512 KB
ceph config set client rbd_readahead_disable_after_bytes 52428800  # Disable after 50 MB
```

For kernel RBD (krbd), configure via sysfs:

```bash
# Set queue read-ahead size
echo 2048 > /sys/block/rbd0/queue/read_ahead_kb
```

## BlueStore Sequential Read Tuning

Tune BlueStore for sequential I/O patterns:

```bash
# Increase blob size for sequential reads
ceph config set osd bluestore_max_blob_size_ssd 131072   # 128 KB for SSD (default 64 KB)
ceph config set osd bluestore_max_blob_size_hdd 524288   # 512 KB for HDD (default 512 KB)

# Enable compression for compressible sequential data
ceph config set osd bluestore_compression_algorithm snappy
ceph config set osd bluestore_compression_mode aggressive
```

## Pool Configuration for Streaming

Use erasure coding for large streaming data to maximize storage efficiency:

```bash
# Create erasure code profile for streaming
ceph osd erasure-code-profile set streaming-profile \
    k=8 m=2 plugin=jerasure technique=reed_sol_van

# Create erasure coded pool
ceph osd pool create ec-streaming 128 128 erasure streaming-profile
ceph osd pool set ec-streaming allow_ec_overwrites true
```

## OS-Level Read-Ahead

Ensure the OS block layer does not limit read-ahead:

```bash
# Increase block device read-ahead (512 KB default is often too low)
blockdev --setra 2048 /dev/sda   # 1 MB (in 512-byte sectors)

# Make persistent with udev rule
cat > /etc/udev/rules.d/60-ceph-readahead.rules << 'EOF'
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{bdi/read_ahead_kb}="1024"
EOF

udevadm control --reload-rules
```

## Benchmarking Sequential Performance

Measure sequential throughput with fio:

```bash
# Sequential read throughput (1 MB block size)
fio --name=seq-read --rw=read --bs=1M --numjobs=4 \
    --iodepth=32 --runtime=60 --filename=/mnt/cephfs/testfile \
    --ioengine=libaio --direct=1 --size=20G --group_reporting

# Verify read-ahead is helping
iostat -x /dev/sda 1 5 | awk '/sda/ {print "rkB/s:", $6, "rMerged/s:", $4}'
```

Expected sequential read numbers for a well-tuned Ceph cluster:
- HDD: 100-200 MB/s per OSD
- SATA SSD: 450-500 MB/s per OSD
- NVMe: 2-4 GB/s per OSD

## Rook StorageClass for Streaming

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-streaming
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: streaming-data
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Summary

Sequential read performance in Ceph benefits from larger object sizes (32 MB for streaming), aggressive read-ahead at both the RBD client and OS block layer, and using erasure coding for storage efficiency at scale. Pool-level tuning with appropriate stripe units ensures data is spread efficiently across OSDs to maximize parallel read throughput during large sequential I/O operations.

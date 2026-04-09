# How to Optimize Ceph for Large Object Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Object Storage, Optimization, RGW

Description: Tune Ceph for high-throughput large object workloads by configuring object striping, RGW chunked upload, erasure coding, and network buffer settings for maximum bandwidth.

---

## Large Object Workload Characteristics

Large object workloads - media files, VM images, database backups, and scientific datasets - require maximizing sustained throughput rather than IOPS. A single 10 GB object write through Ceph involves splitting into 4 MB RADOS objects, distributing across OSDs, and managing multipart completion. The bottleneck is almost always network or disk bandwidth.

## RADOS Object Size and Striping

Configure object size and stripe width when creating RBD images:

```bash
# For large sequential workloads, use larger RADOS objects
# Default is 4 MB; for large files, use 32 MB (RBD maximum)
rbd create large-data-pool/backup-volume --size 1T --object-size 33554432

# Check stripe configuration
rbd info large-data-pool/backup-volume
```

For CephFS with large files, configure stripe settings:

```bash
# Set directory default stripe for new files
setfattr -n ceph.dir.layout.stripe_unit -v 67108864 /mnt/cephfs/large-files
setfattr -n ceph.dir.layout.stripe_count -v 8 /mnt/cephfs/large-files
setfattr -n ceph.dir.layout.object_size -v 67108864 /mnt/cephfs/large-files
```

## RGW Multipart Upload Optimization

For large objects via S3-compatible RGW, tune multipart parameters:

```bash
# Increase RGW chunk size for large object writes
ceph config set client.rgw rgw_max_chunk_size 67108864  # 64 MB chunks

# Increase RGW op thread for parallel part uploads
ceph config set client.rgw rgw_thread_pool_size 256
ceph config set client.rgw rgw_num_rados_handles 16

# Buffer large writes
ceph config set client.rgw rgw_put_obj_min_window_size 16777216
ceph config set client.rgw rgw_put_obj_max_window_size 134217728  # 128 MB window
```

Example multipart upload with AWS SDK:

```python
import boto3

s3 = boto3.client('s3', endpoint_url='http://rook-ceph-rgw:80')

# Initiate multipart upload
response = s3.create_multipart_upload(Bucket='large-data', Key='bigfile.tar.gz')
upload_id = response['UploadId']

# Upload in 64 MB chunks
parts = []
part_number = 1
chunk_size = 64 * 1024 * 1024  # 64 MB

with open('/tmp/bigfile.tar.gz', 'rb') as f:
    while True:
        data = f.read(chunk_size)
        if not data:
            break
        part = s3.upload_part(
            Bucket='large-data', Key='bigfile.tar.gz',
            UploadId=upload_id, PartNumber=part_number, Body=data
        )
        parts.append({'PartNumber': part_number, 'ETag': part['ETag']})
        part_number += 1

# Complete multipart upload
s3.complete_multipart_upload(
    Bucket='large-data', Key='bigfile.tar.gz',
    UploadId=upload_id,
    MultipartUpload={'Parts': parts}
)
```

## Erasure Coding for Storage Efficiency

Large objects are ideal for erasure coded pools - lower overhead than 3x replication:

```bash
# K=6, M=2: 75% storage efficiency vs 33% for 3x replication
ceph osd erasure-code-profile set large-ec-profile \
    k=6 m=2 plugin=jerasure technique=reed_sol_van

ceph osd pool create ec-large-objects 64 64 erasure large-ec-profile
ceph osd pool set ec-large-objects allow_ec_overwrites true
ceph osd pool application enable ec-large-objects rgw
```

## Network Tuning for Large Objects

Maximize TCP throughput for multi-GB transfers:

```bash
# Increase socket buffer sizes
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.wmem_max=134217728
sysctl -w net.ipv4.tcp_rmem="4096 87380 134217728"
sysctl -w net.ipv4.tcp_wmem="4096 87380 134217728"

# Enable TCP BBR congestion control for high-bandwidth paths
modprobe tcp_bbr
sysctl -w net.ipv4.tcp_congestion_control=bbr
```

Persist in `/etc/sysctl.d/99-ceph-large.conf`:

```ini
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_congestion_control = bbr
```

## Benchmarking Large Object Performance

```bash
# Sequential write throughput with 1 MB blocks
fio --name=large-seq-write --rw=write --bs=1M --numjobs=8 \
    --iodepth=8 --runtime=120 --filename=/dev/rbd0 \
    --ioengine=libaio --direct=1 --size=40G --group_reporting

# RGW throughput with rados bench
rados bench -p ec-large-objects 60 write --no-cleanup -b 64M -t 8
```

## Summary

Large object workloads in Ceph benefit from larger RADOS object sizes (64 MB), aggressive TCP buffer tuning for maximum network utilization, and erasure coding pools for storage efficiency. RGW multipart uploads with 64 MB parts maximize parallel I/O across OSDs. CephFS large file performance improves significantly by setting explicit stripe counts that distribute file data across many OSDs simultaneously.

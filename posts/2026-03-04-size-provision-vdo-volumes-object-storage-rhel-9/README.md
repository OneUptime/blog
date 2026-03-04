# How to Size and Provision VDO Volumes for Object Storage on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Object Storage, Storage Planning, Linux

Description: Learn how to properly size and provision VDO volumes on RHEL 9 for object storage workloads, including capacity planning, virtual-to-physical ratios, and memory requirements.

---

Object storage systems like Ceph, MinIO, and OpenStack Swift benefit significantly from VDO's deduplication and compression capabilities. Object storage often contains duplicate data from versioned files, backup copies, and shared content. This guide covers how to properly size and provision VDO volumes for object storage on RHEL 9.

## Prerequisites

- A RHEL 9 system with root or sudo access
- Understanding of your object storage workload characteristics
- Available block storage
- The `lvm2` and `kmod-kvdo` packages installed

## Understanding Object Storage on VDO

Object storage workloads have unique characteristics that affect VDO sizing:

- **Variable object sizes**: Objects can range from a few bytes to several gigabytes
- **Write-once, read-many**: Objects are typically immutable once written
- **Version duplication**: Multiple versions of similar objects create deduplication opportunities
- **Metadata overhead**: Object storage systems maintain significant metadata

## Step 1: Analyze Your Data Profile

Before provisioning, understand your data:

### Deduplication Potential

Estimate how much duplicate data your object store will contain:

| Data Type | Typical Deduplication Ratio |
|-----------|---------------------------|
| Backup archives | 3:1 to 10:1 |
| Document repositories | 2:1 to 5:1 |
| VM images/containers | 5:1 to 10:1 |
| Media files (photos/video) | 1:1 to 1.5:1 |
| Log files | 2:1 to 4:1 |
| Mixed content | 1.5:1 to 3:1 |

### Compression Potential

| Data Type | Typical Compression Ratio |
|-----------|--------------------------|
| Text/JSON/XML | 3:1 to 5:1 |
| Log files | 3:1 to 8:1 |
| Uncompressed images | 1.5:1 to 3:1 |
| Pre-compressed data | 1:1 (no benefit) |
| Database dumps | 2:1 to 4:1 |

### Combined Savings

Deduplication and compression work together. Combined savings are multiplicative for the deduplicated portion and additive for the compressed remainder.

## Step 2: Calculate Physical Storage Requirements

Use this formula:

```
Physical Storage = (Logical Data Size) / (Expected Combined Ratio) + Overhead
```

Example: 10 TB of backup data with an expected 5:1 combined ratio:

```
Physical Storage = 10 TB / 5 + 15% overhead
Physical Storage = 2 TB + 0.3 TB = 2.3 TB
```

Add 15-20% overhead for:
- VDO metadata
- UDS deduplication index
- XFS filesystem overhead
- Growth buffer

## Step 3: Calculate Memory Requirements

VDO's UDS (Universal Deduplication Service) index requires RAM:

### Dense Index (Default)

- 1 GB RAM per 1 TB of physical storage
- Suitable for most workloads
- Uses less memory but may have slightly lower deduplication for very large datasets

### Sparse Index

- 1 GB RAM per 10 TB of physical storage
- Suitable for large-scale deployments
- Uses less memory but deduplication effectiveness depends on data locality

For a 2 TB physical VDO volume with dense index:
- UDS index memory: approximately 2 GB
- Block map cache: 128 MB (default)
- Total VDO memory: approximately 2.2 GB

Ensure your system has sufficient RAM beyond normal operating requirements.

## Step 4: Provision the VDO Volume

Create the physical infrastructure:

```bash
sudo pvcreate /dev/sdb /dev/sdc
sudo vgcreate vg_objstore /dev/sdb /dev/sdc
```

Create the VDO volume with appropriate sizing:

```bash
sudo lvcreate --type vdo --name lv_objects \
  --size 2T \
  --virtualsize 10T \
  vg_objstore
```

For object storage with heavy deduplication (backup targets):

```bash
sudo lvcreate --type vdo --name lv_backup \
  --size 2T \
  --virtualsize 20T \
  vg_objstore
```

## Step 5: Format for Object Storage

```bash
sudo mkfs.xfs -K /dev/vg_objstore/lv_objects
sudo mkdir -p /srv/object-storage
sudo mount -o discard /dev/vg_objstore/lv_objects /srv/object-storage
```

Add to `/etc/fstab`:

```
/dev/vg_objstore/lv_objects /srv/object-storage xfs defaults,discard 0 0
```

## Step 6: Configure Object Storage Software

### For MinIO

```bash
sudo mkdir -p /srv/object-storage/minio-data
# Configure MinIO to use /srv/object-storage/minio-data
```

### For Ceph OSD

When using VDO as the backing store for Ceph OSD:

```bash
# Use the VDO volume as the OSD device
sudo ceph-volume lvm create --data vg_objstore/lv_objects
```

## Step 7: Tune VDO for Object Storage

### Block Map Cache

Increase the block map cache for better random access performance:

```bash
sudo lvchange --vdosettings 'block_map_cache_size_mb=512' vg_objstore/lv_objects
```

### Thread Count

For high-throughput object storage:

```bash
sudo lvchange --vdosettings 'bio_threads=4,cpu_threads=4' vg_objstore/lv_objects
```

### Write Policy

For object storage that prioritizes throughput over strict durability guarantees:

```bash
sudo lvchange --vdosettings 'write_policy=async' vg_objstore/lv_objects
```

For production environments requiring durability:

```bash
sudo lvchange --vdosettings 'write_policy=sync' vg_objstore/lv_objects
```

## Step 8: Monitor and Adjust

### Track Space Savings

```bash
sudo vdostats --human-readable
```

Watch these metrics:
- **Saving percent**: Overall data reduction
- **Used physical blocks**: Actual disk consumption
- **Data blocks used**: Logical blocks stored

### Monitor Physical Capacity

```bash
sudo lvs -o name,size,data_percent,vdo_saving_percent vg_objstore
```

### Adjust Virtual Size

If savings are better than expected, increase virtual size:

```bash
sudo lvextend --virtualsize 15T vg_objstore/lv_objects
sudo xfs_growfs /srv/object-storage
```

If savings are worse than expected, add physical storage:

```bash
sudo pvcreate /dev/sdd
sudo vgextend vg_objstore /dev/sdd
sudo lvextend --size +1T vg_objstore/lv_objects
```

## Sizing Reference Table

| Scenario | Physical | Virtual | Ratio | RAM for UDS |
|----------|----------|---------|-------|-------------|
| Small backup target | 500 GB | 2.5 TB | 5:1 | 512 MB |
| Medium object store | 2 TB | 6 TB | 3:1 | 2 GB |
| Large backup target | 5 TB | 50 TB | 10:1 | 5 GB |
| Media repository | 10 TB | 15 TB | 1.5:1 | 10 GB |
| VM image store | 2 TB | 20 TB | 10:1 | 2 GB |

## Best Practices

- **Start conservative**: Use a lower virtual-to-physical ratio and increase as you observe actual savings.
- **Monitor continuously**: Object storage usage patterns can change over time.
- **Plan for growth**: Keep some physical capacity in reserve for unexpected data growth.
- **Account for VDO overhead**: Budget 15-20% physical overhead beyond calculated needs.
- **Test with representative data**: Before production deployment, test with data samples that represent your actual workload.
- **Consider data lifecycle**: Understand how long objects are retained and how often they are versioned.

## Conclusion

Proper sizing and provisioning of VDO volumes for object storage on RHEL 9 requires understanding your data profile, calculating realistic deduplication and compression ratios, and accounting for memory and overhead requirements. By starting with conservative estimates and adjusting based on observed savings, you can optimize your storage investment while maintaining reliable service. The combination of VDO with object storage creates a highly efficient storage tier that can significantly reduce hardware costs.

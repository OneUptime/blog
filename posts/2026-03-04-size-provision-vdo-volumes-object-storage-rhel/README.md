# How to Size and Provision VDO Volumes for Object Storage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Storage, Deduplication, Compression, Linux

Description: Learn how to properly size and provision VDO (Virtual Data Optimizer) volumes on RHEL for object storage workloads, including logical-to-physical ratios and capacity planning.

---

VDO (Virtual Data Optimizer) provides inline deduplication and compression for block storage on RHEL. Proper sizing is critical because VDO uses a logical-to-physical mapping that depends on your expected data reduction ratio. Over-provisioning too aggressively can lead to out-of-space conditions.

## Installing VDO

```bash
# Install VDO and its dependencies
sudo dnf install -y vdo kmod-kvdo
```

## Understanding VDO Sizing

VDO creates a logical volume that appears larger than the physical storage. The ratio depends on how much deduplication and compression your data allows:

- **Object storage with mixed data**: 3:1 ratio is a reasonable starting point
- **VM images or container layers**: 6:1 or higher is common
- **Already-compressed data (media, archives)**: 1:1 to 1.5:1

## Creating a VDO Volume for Object Storage

```bash
# Create a VDO volume on /dev/sdb
# Physical size: 100GB, Logical size: 300GB (3:1 ratio)
sudo vdo create \
  --name=vdo-objectstore \
  --device=/dev/sdb \
  --vdoLogicalSize=300G \
  --vdoSlabSize=2G

# Check the VDO volume status
sudo vdo status --name=vdo-objectstore
```

## Formatting and Mounting

```bash
# Create an XFS filesystem on the VDO volume
# Use the -K flag to skip discards during mkfs (faster)
sudo mkfs.xfs -K /dev/mapper/vdo-objectstore

# Create mount point and mount
sudo mkdir -p /mnt/objectstore
sudo mount /dev/mapper/vdo-objectstore /mnt/objectstore

# Add to /etc/fstab for persistent mounting
echo "/dev/mapper/vdo-objectstore /mnt/objectstore xfs defaults,x-systemd.requires=vdo.service 0 0" | sudo tee -a /etc/fstab
```

## Checking Space Usage

```bash
# View VDO statistics including physical and logical usage
sudo vdostats --human-readable

# Output shows:
# Device              Size   Used  Available  Use%  Space saving%
# /dev/mapper/vdo-objectstore  100.0G  10.0G   90.0G   10%   65%
```

## Capacity Planning Tips

```bash
# Monitor VDO usage over time
# Set up a cron job to log space savings
echo '*/30 * * * * root vdostats --human-readable >> /var/log/vdo-stats.log' | sudo tee /etc/cron.d/vdo-monitor
```

Start conservatively with a 2:1 or 3:1 logical-to-physical ratio. Monitor actual deduplication and compression rates for a few weeks before increasing the logical size. Running out of physical space on a VDO volume causes I/O errors, so leave headroom.

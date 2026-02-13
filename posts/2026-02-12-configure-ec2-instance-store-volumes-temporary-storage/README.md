# How to Configure EC2 Instance Store Volumes for Temporary Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Instance Store, Storage, Performance

Description: A practical guide to using EC2 instance store volumes for temporary high-performance storage including setup, use cases, and data persistence caveats.

---

EC2 instance store volumes are the fastest storage you can get on AWS. They're physically attached to the host machine, providing NVMe-level performance without network overhead. But there's a catch that trips people up: the data doesn't survive instance stops, terminations, or hardware failures.

If you understand that trade-off and design around it, instance stores are incredibly useful. Let's dig into how to configure and use them properly.

## What Are Instance Store Volumes?

Instance store volumes (also called ephemeral storage) are SSDs or HDDs physically attached to the host computer where your EC2 instance runs. Unlike EBS volumes, which are network-attached, instance store volumes are local to the hardware.

Key characteristics:

- **Speed** - NVMe SSDs with hundreds of thousands of IOPS and multi-GB/s throughput
- **Cost** - Included in the instance price (no extra charge)
- **Persistence** - Data survives reboots but is lost on stop, terminate, or hardware failure
- **Size** - Fixed per instance type, can't be resized

## Which Instance Types Have Instance Store?

Not all instance types include instance store. Here are the common ones:

| Instance Family | Instance Store | Type | Use Case |
|----------------|---------------|------|----------|
| i3, i3en, i4i | Up to 60 TB | NVMe SSD | Storage-optimized |
| d2, d3, d3en | Up to 336 TB | HDD | Dense storage |
| c5d, m5d, r5d | Up to 3.6 TB | NVMe SSD | General purpose + local SSD |
| c6id, m6id, r6id | Up to 7.6 TB | NVMe SSD | Latest gen with local SSD |
| z1d | Up to 1.8 TB | NVMe SSD | High frequency + local SSD |

The `d` suffix on an instance type (like c5d, m5d) generally means it includes instance store volumes. The `i` family is purpose-built for maximum local storage performance.

## Finding and Mounting Instance Store Volumes

When you launch an instance with instance store, the volumes are available but might not be formatted or mounted. Here's how to discover and set them up.

This script finds all NVMe instance store volumes and sets them up:

```bash
#!/bin/bash
# setup-instance-store.sh

# Find all NVMe instance store devices
DEVICES=$(lsblk -dno NAME,MODEL | grep "Instance Storage" | awk '{print "/dev/"$1}')

if [ -z "$DEVICES" ]; then
  echo "No instance store volumes found"
  exit 0
fi

echo "Found instance store devices: $DEVICES"

# Format and mount each device
MOUNT_INDEX=0
for dev in $DEVICES; do
  MOUNT_POINT="/mnt/instance-store-$MOUNT_INDEX"

  # Create filesystem (ext4 is a good default, xfs for larger volumes)
  mkfs.ext4 -E nodiscard "$dev"

  # Create mount point
  mkdir -p "$MOUNT_POINT"

  # Mount with performance-optimized options
  mount -o defaults,noatime,nodiscard "$dev" "$MOUNT_POINT"

  # Set permissions
  chmod 1777 "$MOUNT_POINT"

  echo "Mounted $dev at $MOUNT_POINT"
  MOUNT_INDEX=$((MOUNT_INDEX + 1))
done
```

For Amazon Linux 2 and newer instances, NVMe instance store volumes show up as `/dev/nvme*n1` devices. You can identify them using `nvme list`:

```bash
# List all NVMe devices and identify instance store
nvme list

# Or use lsblk to see all block devices
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL
```

## Creating a RAID Array from Multiple Instance Store Volumes

Many instance types include multiple instance store volumes. For maximum throughput, combine them into a RAID 0 array.

This script creates a RAID 0 array from all available instance store volumes:

```bash
#!/bin/bash
# setup-raid0.sh - Combine instance store volumes into RAID 0

# Find instance store NVMe devices
DEVICES=$(lsblk -dno NAME,MODEL | grep "Instance Storage" | awk '{print "/dev/"$1}')
DEVICE_COUNT=$(echo "$DEVICES" | wc -w)

if [ "$DEVICE_COUNT" -lt 2 ]; then
  echo "Need at least 2 devices for RAID. Found: $DEVICE_COUNT"
  exit 1
fi

echo "Creating RAID 0 with $DEVICE_COUNT devices: $DEVICES"

# Install mdadm if not present
yum install -y mdadm || apt-get install -y mdadm

# Create RAID 0 array
mdadm --create /dev/md0 \
  --level=0 \
  --raid-devices=$DEVICE_COUNT \
  $DEVICES

# Wait for array to initialize
mdadm --wait /dev/md0

# Create filesystem
mkfs.ext4 -E nodiscard /dev/md0

# Mount the array
mkdir -p /mnt/instance-store
mount -o defaults,noatime,nodiscard /dev/md0 /mnt/instance-store

# Set permissions
chmod 1777 /mnt/instance-store

echo "RAID 0 array mounted at /mnt/instance-store"
echo "Total size: $(df -h /mnt/instance-store | tail -1 | awk '{print $2}')"
```

RAID 0 gives you the combined throughput and IOPS of all volumes. On an i3.16xlarge with 8 NVMe SSDs, a RAID 0 array delivers over 3 million random IOPS and 14 GB/s sequential throughput.

## User Data Script for Automatic Setup

Put the instance store setup in your user data so it happens automatically at launch:

```bash
#!/bin/bash
# User data script for instance store setup
set -e

# Wait for NVMe devices to be available
sleep 10

# Install dependencies
yum install -y mdadm

# Find instance store devices
DEVICES=$(nvme list | grep "Instance Storage" | awk '{print $1}')
DEVICE_COUNT=$(echo "$DEVICES" | wc -w)

if [ "$DEVICE_COUNT" -eq 0 ]; then
  echo "No instance store volumes found"
  exit 0
elif [ "$DEVICE_COUNT" -eq 1 ]; then
  # Single device - format and mount directly
  mkfs.ext4 -E nodiscard $DEVICES
  mkdir -p /mnt/data
  mount -o defaults,noatime,nodiscard $DEVICES /mnt/data
else
  # Multiple devices - create RAID 0
  mdadm --create /dev/md0 --level=0 --raid-devices=$DEVICE_COUNT $DEVICES
  mkfs.ext4 -E nodiscard /dev/md0
  mkdir -p /mnt/data
  mount -o defaults,noatime,nodiscard /dev/md0 /mnt/data
fi

chmod 1777 /mnt/data

# Add to fstab for reboot persistence
# Note: UUID changes on reboot for instance store, use device path
echo "/dev/md0 /mnt/data ext4 defaults,noatime,nodiscard 0 0" >> /etc/fstab

echo "Instance store setup complete: $(df -h /mnt/data | tail -1)"
```

## Best Use Cases for Instance Store

Instance store volumes excel in specific scenarios:

**Temporary scratch space** - Build systems, compilation, image processing. Fast I/O during processing, no need to persist.

```bash
# Example: use instance store as Docker data directory
# This speeds up image pulls and container creation significantly
systemctl stop docker
mv /var/lib/docker /mnt/data/docker
ln -s /mnt/data/docker /var/lib/docker
systemctl start docker
```

**Caching layers** - Redis, Memcached, or Elasticsearch caches. Data can be rebuilt from the primary source.

**Swap space** - On instances with limited memory, use instance store for swap instead of EBS (it's faster and free).

```bash
# Set up swap on instance store
dd if=/dev/zero of=/mnt/instance-store-0/swapfile bs=1G count=8
chmod 600 /mnt/instance-store-0/swapfile
mkswap /mnt/instance-store-0/swapfile
swapon /mnt/instance-store-0/swapfile
```

**Log buffering** - Write logs to instance store for speed, then batch-ship them to S3 or CloudWatch.

**Database temp tables** - Configure MySQL or PostgreSQL to use instance store for temporary tablespaces.

## Performance Benchmarking

Benchmark your instance store to know what you're working with.

This uses fio to measure random read IOPS and throughput:

```bash
# Install fio
yum install -y fio

# Random read IOPS test
fio --name=randread \
  --directory=/mnt/data \
  --ioengine=libaio \
  --direct=1 \
  --rw=randread \
  --bs=4k \
  --size=4G \
  --numjobs=16 \
  --iodepth=32 \
  --runtime=60 \
  --time_based \
  --group_reporting

# Sequential write throughput test
fio --name=seqwrite \
  --directory=/mnt/data \
  --ioengine=libaio \
  --direct=1 \
  --rw=write \
  --bs=1M \
  --size=10G \
  --numjobs=4 \
  --iodepth=8 \
  --runtime=60 \
  --time_based \
  --group_reporting
```

## Data Persistence Warning

This cannot be stressed enough: instance store data is ephemeral. It's lost when:

- The instance is stopped (not reboot - reboot is fine)
- The instance is terminated
- The underlying hardware fails
- The instance is hibernated

If you're storing anything that can't be regenerated, it needs to go on EBS, EFS, or S3. Use instance store only for data you can afford to lose.

A good pattern is to write to instance store for speed and asynchronously replicate to durable storage:

```bash
# Async sync from instance store to S3 every 5 minutes
*/5 * * * * aws s3 sync /mnt/data/output s3://my-bucket/output --quiet
```

## Summary

Instance store volumes provide the highest I/O performance available on EC2 at no extra cost. They're perfect for temporary data, caches, scratch space, and any workload where the data can be regenerated. The key is designing your application to treat instance store as what it is - a fast but ephemeral scratchpad. Set up your volumes in user data for automatic provisioning, use RAID 0 for maximum throughput, and always have a plan for data that needs to survive instance lifecycle events. For monitoring the health of your storage and instances, check out [OneUptime's infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-12-enable-use-ec2-hibernation/view).

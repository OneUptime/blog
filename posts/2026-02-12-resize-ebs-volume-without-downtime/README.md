# How to Resize an EBS Volume Without Downtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, EBS, Storage, Scaling

Description: Learn how to increase the size of an EBS volume on a running EC2 instance without any downtime, including filesystem expansion for both Linux and Windows.

---

Running out of disk space used to mean downtime - you'd have to stop the instance, create a bigger volume, copy data, and swap things around. With modern EBS, you can increase a volume's size, change its type, or adjust its IOPS while the volume is attached and in use. The instance never needs to stop.

This guide walks through the process from start to finish, including the filesystem-level steps that AWS doesn't handle for you automatically.

## What You Can Change Online

EBS Elastic Volumes lets you modify these parameters on a live, attached volume:

- **Size** - increase only (you can't shrink a volume)
- **Volume type** - switch between gp2, gp3, io1, io2, st1, sc1
- **IOPS** - adjust provisioned IOPS (for io1, io2, and gp3)
- **Throughput** - adjust provisioned throughput (for gp3)

There's one restriction: you can only modify a volume once every 6 hours. After a modification, the volume enters an "optimizing" state, and you need to wait for it to complete before making another change.

## Step 1: Modify the Volume in AWS

### Via the Console

1. Go to EC2 > Volumes
2. Select the volume
3. Click "Actions" > "Modify volume"
4. Enter the new size (e.g., increase from 100 GB to 200 GB)
5. Click "Modify"
6. Confirm the modification

### Via the CLI

```bash
# Increase a volume from its current size to 200 GB
aws ec2 modify-volume \
    --volume-id vol-0123456789abcdef0 \
    --size 200
```

To change type and performance at the same time:

```bash
# Switch from gp2 to gp3 and increase size, IOPS, and throughput
aws ec2 modify-volume \
    --volume-id vol-0123456789abcdef0 \
    --volume-type gp3 \
    --size 500 \
    --iops 6000 \
    --throughput 400
```

### Check Modification Progress

```bash
# Monitor the modification status
aws ec2 describe-volumes-modifications \
    --volume-ids vol-0123456789abcdef0 \
    --query 'VolumesModifications[0].{State:ModificationState,Progress:Progress,OriginalSize:OriginalSize,TargetSize:TargetSize}'
```

The modification goes through these states:
1. **modifying** - AWS is changing the volume's properties
2. **optimizing** - The volume is usable but still being optimized in the background
3. **completed** - All done

You can start the filesystem expansion as soon as the state is "optimizing" - you don't need to wait for "completed."

## Step 2: Extend the Partition (If Applicable)

If the volume uses a partition table (most root volumes do), you need to extend the partition before extending the filesystem.

Check whether you have a partition:

```bash
# Check the block device layout
lsblk

# Root volume with partition:
# NAME          MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
# nvme0n1       259:0    0  200G  0 disk            <-- Volume is 200G
# └─nvme0n1p1   259:1    0  100G  0 part /          <-- Partition is still 100G

# Additional volume without partition:
# nvme1n1       259:2    0  200G  0 disk /data       <-- No partition, mounted directly
```

If there's a partition (like `nvme0n1p1`), extend it with `growpart`:

```bash
# Extend the partition to use all available space
# The "1" refers to partition number 1
sudo growpart /dev/nvme0n1 1

# Verify the partition expanded
lsblk
# nvme0n1       259:0    0  200G  0 disk
# └─nvme0n1p1   259:1    0  200G  0 part /    <-- Now 200G
```

If `growpart` isn't installed:

```bash
# Install growpart on Amazon Linux / RHEL
sudo yum install -y cloud-utils-growpart

# Install on Ubuntu / Debian
sudo apt install -y cloud-guest-utils
```

## Step 3: Extend the Filesystem

Now extend the filesystem to fill the expanded partition or volume.

### For XFS Filesystems

```bash
# Extend an XFS filesystem (common on Amazon Linux)
sudo xfs_growfs /data

# Or for the root filesystem
sudo xfs_growfs /

# XFS uses the mount point, not the device path
```

### For ext4 Filesystems

```bash
# Extend an ext4 filesystem (common on Ubuntu)
sudo resize2fs /dev/nvme0n1p1

# For an additional volume without partition
sudo resize2fs /dev/nvme1n1

# ext4 uses the device path, not the mount point
```

### Verify the New Size

```bash
# Confirm the filesystem shows the new size
df -h /data

# Or for root
df -h /
```

## Complete Example: Expanding the Root Volume

Here's the entire process for expanding a root volume from 8 GB to 50 GB on an Amazon Linux instance:

```bash
# Step 1: Modify the volume (run from your local machine or with AWS CLI)
aws ec2 modify-volume \
    --volume-id vol-0123456789abcdef0 \
    --size 50

# Step 2: Wait for modification to reach "optimizing" state
aws ec2 describe-volumes-modifications \
    --volume-ids vol-0123456789abcdef0

# Steps 3-5: Run on the instance via SSH

# Check current state
lsblk
df -h /

# Extend the partition
sudo growpart /dev/nvme0n1 1

# Extend the filesystem (XFS on Amazon Linux)
sudo xfs_growfs /

# Verify
df -h /
# Should show ~50G total
```

## Expanding on Windows

Windows instances use the Disk Management tool or diskpart:

```powershell
# List all volumes and their sizes
Get-Partition | Format-Table DiskNumber, PartitionNumber, Size, DriveLetter

# Extend the partition to use all available space
# First, get the maximum supported size
$MaxSize = (Get-PartitionSupportedSize -DriveLetter D).SizeMax

# Then resize the partition
Resize-Partition -DriveLetter D -Size $MaxSize

# Verify
Get-Volume D
```

Or use diskpart:

```
diskpart
list volume
select volume 1
extend
exit
```

## Automating the Full Process

Here's a script that handles the entire resize flow:

```bash
#!/bin/bash
# Resize an EBS volume and expand the filesystem without downtime

VOLUME_ID=$1
NEW_SIZE=$2
MOUNT_POINT=$3  # e.g., "/" or "/data"

if [ -z "$VOLUME_ID" ] || [ -z "$NEW_SIZE" ] || [ -z "$MOUNT_POINT" ]; then
    echo "Usage: $0 <volume-id> <new-size-gb> <mount-point>"
    exit 1
fi

# Get current size
CURRENT_SIZE=$(aws ec2 describe-volumes \
    --volume-ids $VOLUME_ID \
    --query 'Volumes[0].Size' \
    --output text)

echo "Current size: ${CURRENT_SIZE}GB, New size: ${NEW_SIZE}GB"

if [ "$NEW_SIZE" -le "$CURRENT_SIZE" ]; then
    echo "Error: New size must be larger than current size"
    exit 1
fi

# Modify the volume
echo "Modifying volume..."
aws ec2 modify-volume --volume-id $VOLUME_ID --size $NEW_SIZE

# Wait for modification to start
sleep 5

# Poll until the modification is at least "optimizing"
while true; do
    STATE=$(aws ec2 describe-volumes-modifications \
        --volume-ids $VOLUME_ID \
        --query 'VolumesModifications[0].ModificationState' \
        --output text)

    echo "Modification state: $STATE"

    if [ "$STATE" = "optimizing" ] || [ "$STATE" = "completed" ]; then
        break
    fi
    sleep 10
done

echo "Volume modified. Now expanding filesystem..."

# Find the device for this mount point
DEVICE=$(df $MOUNT_POINT | tail -1 | awk '{print $1}')
echo "Device: $DEVICE"

# Check if there's a partition to grow
PARENT_DEVICE=$(lsblk -no pkname $DEVICE)
if [ -n "$PARENT_DEVICE" ]; then
    PART_NUM=$(echo $DEVICE | grep -o '[0-9]*$')
    echo "Growing partition $PART_NUM on /dev/$PARENT_DEVICE..."
    sudo growpart /dev/$PARENT_DEVICE $PART_NUM
fi

# Determine filesystem type and extend
FS_TYPE=$(df -T $MOUNT_POINT | tail -1 | awk '{print $2}')
echo "Filesystem type: $FS_TYPE"

case $FS_TYPE in
    xfs)
        sudo xfs_growfs $MOUNT_POINT
        ;;
    ext4|ext3|ext2)
        sudo resize2fs $DEVICE
        ;;
    *)
        echo "Unsupported filesystem: $FS_TYPE"
        exit 1
        ;;
esac

# Verify
echo "Done! New filesystem size:"
df -h $MOUNT_POINT
```

## Things to Watch Out For

**6-hour cooldown between modifications.** If you resize to 200 GB and realize you need 300 GB, you have to wait 6 hours. Plan ahead.

**You can't shrink volumes.** If you over-provisioned, your only option is to create a smaller volume, copy the data, and swap them.

**Filesystem expansion isn't automatic.** AWS resizes the block device, but you must extend the partition and filesystem yourself. Some newer AMIs have a service that does this automatically on boot, but don't count on it.

**gp2 performance scales with size.** gp2 volumes get 3 IOPS per GB. If you're on gp2 and need more IOPS, increasing the size is one way to get them. But switching to gp3 and setting explicit IOPS is usually a better approach. See our guide on [EBS volume types](https://oneuptime.com/blog/post/2026-02-12-choose-between-ebs-volume-types/view).

**Monitor disk usage proactively.** Don't wait until you're at 100% to resize. Set up alerts at 80% usage so you have time to act. Use [OneUptime](https://oneuptime.com) or CloudWatch to monitor disk utilization across your fleet.

EBS volume resizing is one of the best features of cloud storage. Zero downtime, no data migration, no backup-and-restore dance. Just bump up the size and extend the filesystem. It takes the stress out of capacity planning because you can always grow later.

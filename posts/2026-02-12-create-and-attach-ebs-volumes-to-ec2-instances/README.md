# How to Create and Attach EBS Volumes to EC2 Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, EBS, Storage, Volumes

Description: Step-by-step guide to creating EBS volumes, attaching them to EC2 instances, formatting, mounting, and configuring persistent mounts across reboots.

---

Elastic Block Store (EBS) provides persistent block storage for EC2 instances. Unlike instance store volumes that disappear when you stop an instance, EBS volumes persist independently and can be attached, detached, and reattached to different instances. They're the primary storage mechanism for most EC2 workloads.

This guide covers creating volumes, attaching them, and setting them up so they work correctly across reboots.

## EBS Basics

A few things to know upfront:

- EBS volumes are availability zone-specific. A volume in us-east-1a can only attach to instances in us-east-1a.
- Each instance has a root EBS volume (where the OS lives) and can have additional volumes attached.
- Volumes can only be attached to one instance at a time (except for io1/io2 Multi-Attach, which is a special case).
- Performance characteristics depend on the volume type. See our guide on [choosing between EBS volume types](https://oneuptime.com/blog/post/choose-between-ebs-volume-types/view) for details.

## Creating an EBS Volume

### Via the Console

1. Go to EC2 > Volumes in the left navigation
2. Click "Create volume"
3. Configure:
   - **Volume type**: gp3 is the best default choice
   - **Size**: In GiB (1 GiB to 16 TiB)
   - **Availability Zone**: Must match your instance's AZ
   - **Encryption**: Enable with KMS key (recommended)
4. Click "Create volume"

### Via the CLI

```bash
# Create a 100 GB gp3 volume in us-east-1a
aws ec2 create-volume \
    --volume-type gp3 \
    --size 100 \
    --availability-zone us-east-1a \
    --encrypted \
    --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=data-volume},{Key=Environment,Value=production}]'

# The command returns the volume ID
# vol-0123456789abcdef0
```

For gp3 volumes, you can also customize IOPS and throughput:

```bash
# Create a gp3 volume with custom performance
aws ec2 create-volume \
    --volume-type gp3 \
    --size 500 \
    --iops 6000 \
    --throughput 400 \
    --availability-zone us-east-1a \
    --encrypted
```

## Attaching a Volume to an Instance

### Via the Console

1. Select the volume
2. Click "Actions" > "Attach volume"
3. Select the instance
4. Choose a device name (e.g., /dev/xvdf)
5. Click "Attach volume"

### Via the CLI

```bash
# Attach a volume to an instance
aws ec2 attach-volume \
    --volume-id vol-0123456789abcdef0 \
    --instance-id i-0123456789abcdef0 \
    --device /dev/xvdf
```

Wait for the attachment to complete:

```bash
# Check the volume state
aws ec2 describe-volumes \
    --volume-ids vol-0123456789abcdef0 \
    --query 'Volumes[0].Attachments[0].State'
# Should show "attached"
```

## Formatting and Mounting the Volume

After attaching, the volume appears as a block device on the instance. You need to format and mount it.

### Step 1: Identify the Device

```bash
# List all block devices
lsblk

# Output looks like:
# NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
# xvda    202:0    0    8G  0 disk
# └─xvda1 202:1    0    8G  0 part /
# xvdf    202:80   0  100G  0 disk
```

On Nitro-based instances, the device might show as `/dev/nvme1n1` instead of `/dev/xvdf`:

```bash
# On Nitro instances, check NVMe devices
lsblk
# NAME          MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
# nvme0n1       259:0    0    8G  0 disk
# └─nvme0n1p1   259:1    0    8G  0 part /
# nvme1n1       259:2    0  100G  0 disk
```

### Step 2: Check if the Volume Has a Filesystem

```bash
# Check for an existing filesystem
sudo file -s /dev/xvdf

# If it says "data", there's no filesystem yet
# If it shows a filesystem type (ext4, xfs), it's already formatted
```

### Step 3: Create a Filesystem

Only do this on a new, empty volume. Formatting destroys all data!

```bash
# Create an XFS filesystem (recommended for most workloads)
sudo mkfs -t xfs /dev/xvdf

# Or create ext4 if you prefer
sudo mkfs -t ext4 /dev/xvdf
```

### Step 4: Create a Mount Point and Mount

```bash
# Create the mount point directory
sudo mkdir -p /data

# Mount the volume
sudo mount /dev/xvdf /data

# Verify the mount
df -h /data
```

### Step 5: Configure Persistent Mount (Survive Reboots)

The mount won't persist after a reboot unless you add it to `/etc/fstab`. Use the volume's UUID instead of the device name, since device names can change:

```bash
# Get the UUID of the volume
sudo blkid /dev/xvdf
# /dev/xvdf: UUID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" TYPE="xfs"

# Back up fstab before editing
sudo cp /etc/fstab /etc/fstab.backup

# Add the mount entry to fstab
echo 'UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890  /data  xfs  defaults,nofail  0  2' | sudo tee -a /etc/fstab
```

The `nofail` option is important - it lets the instance boot even if the volume isn't available. Without it, a missing volume would prevent the instance from booting.

Test the fstab entry:

```bash
# Unmount and remount using fstab to verify
sudo umount /data
sudo mount -a

# Check that it mounted correctly
df -h /data
```

## Full Automation Script

Here's a complete script that creates, attaches, formats, and mounts a volume:

```bash
#!/bin/bash
# Create and set up a new EBS volume for an EC2 instance

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
VOLUME_SIZE=100
MOUNT_POINT="/data"
DEVICE="/dev/xvdf"

# Create the volume
echo "Creating ${VOLUME_SIZE}GB gp3 volume in $AZ..."
VOLUME_ID=$(aws ec2 create-volume \
    --volume-type gp3 \
    --size $VOLUME_SIZE \
    --availability-zone $AZ \
    --encrypted \
    --tag-specifications "ResourceType=volume,Tags=[{Key=Name,Value=data-${INSTANCE_ID}},{Key=InstanceId,Value=$INSTANCE_ID}]" \
    --query 'VolumeId' \
    --output text)

echo "Volume created: $VOLUME_ID"

# Wait for volume to be available
aws ec2 wait volume-available --volume-ids $VOLUME_ID
echo "Volume is available"

# Attach to this instance
aws ec2 attach-volume \
    --volume-id $VOLUME_ID \
    --instance-id $INSTANCE_ID \
    --device $DEVICE

echo "Attaching volume..."
sleep 10  # Wait for device to appear

# Wait for the device to be present
while [ ! -b $DEVICE ]; do
    echo "Waiting for device $DEVICE..."
    sleep 2
done

# Format the volume
echo "Formatting volume..."
sudo mkfs -t xfs $DEVICE

# Mount it
sudo mkdir -p $MOUNT_POINT
sudo mount $DEVICE $MOUNT_POINT

# Add to fstab for persistence
UUID=$(sudo blkid -s UUID -o value $DEVICE)
echo "UUID=$UUID  $MOUNT_POINT  xfs  defaults,nofail  0  2" | sudo tee -a /etc/fstab

echo "Volume $VOLUME_ID mounted at $MOUNT_POINT"
```

## Attaching Multiple Volumes

Instances can have up to 28 EBS volumes attached (though the practical limit depends on the instance type). This is useful for separating data, logs, and temp storage:

```bash
# Create and attach multiple volumes for different purposes
for PURPOSE in data logs temp; do
    DEVICE="/dev/xvd${PURPOSE:0:1}"  # /dev/xvdd, /dev/xvdl, /dev/xvdt

    VOL_ID=$(aws ec2 create-volume \
        --volume-type gp3 \
        --size 50 \
        --availability-zone us-east-1a \
        --encrypted \
        --tag-specifications "ResourceType=volume,Tags=[{Key=Name,Value=$PURPOSE-vol}]" \
        --query 'VolumeId' \
        --output text)

    aws ec2 wait volume-available --volume-ids $VOL_ID

    aws ec2 attach-volume \
        --volume-id $VOL_ID \
        --instance-id i-0123456789abcdef0 \
        --device $DEVICE

    echo "Attached $VOL_ID as $DEVICE for $PURPOSE"
done
```

## Monitoring EBS Volumes

Keep an eye on volume performance and utilization:

```bash
# Check volume IOPS and throughput from inside the instance
iostat -x 5

# Or check CloudWatch metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/EBS \
    --metric-name VolumeReadOps \
    --dimensions Name=VolumeId,Value=vol-0123456789abcdef0 \
    --start-time 2026-02-12T00:00:00Z \
    --end-time 2026-02-12T12:00:00Z \
    --period 300 \
    --statistics Average
```

Set up [monitoring with OneUptime](https://oneuptime.com) to track disk usage and get alerted before volumes fill up.

## Common Mistakes

**Forgetting the nofail option in fstab.** Without it, your instance won't boot if the volume is unavailable. This is especially painful because you can't SSH in to fix it.

**Wrong availability zone.** The volume must be in the same AZ as the instance. This is the most common reason an attach fails.

**Not formatting the volume.** A new volume is raw storage with no filesystem. You must format it before you can store files.

**Using device names on Nitro instances.** Nitro-based instances (most modern types) expose EBS volumes as NVMe devices. The device name you specify during attach (/dev/xvdf) might appear as /dev/nvme1n1 inside the instance.

**Not encrypting.** Always encrypt EBS volumes. There's no performance penalty, and it protects data at rest. See our guide on [encrypting EBS volumes](https://oneuptime.com/blog/post/encrypt-ebs-volumes-on-existing-ec2-instances/view).

EBS volumes are the bread and butter of EC2 storage. Master the create-attach-format-mount workflow, and you'll be well-equipped to handle almost any storage need on AWS.

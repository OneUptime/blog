# How to Set Up RAID on EBS Volumes for EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, EBS, Storage, RAID

Description: A practical guide to setting up RAID arrays on EBS volumes for EC2 instances, covering RAID 0 and RAID 1 configurations with step-by-step instructions.

---

Sometimes a single EBS volume just doesn't cut it. Maybe you need more IOPS than a single volume can deliver, or you want redundancy beyond what EBS already provides. That's where RAID comes in. By combining multiple EBS volumes into a RAID array, you can boost performance, add fault tolerance, or both.

Let's walk through setting up RAID on EBS volumes attached to an EC2 instance, from creating the volumes all the way to making the array persistent across reboots.

## Which RAID Level Should You Use?

Before we start clicking buttons, let's be clear about which RAID levels make sense on AWS:

**RAID 0 (Striping)** - Combines multiple volumes for higher throughput and IOPS. If you need 64,000 IOPS but a single gp3 volume tops out at 16,000, you can stripe four gp3 volumes together. The downside? If any single volume fails, you lose everything. But since EBS volumes already have built-in redundancy within their availability zone, this risk is minimal.

**RAID 1 (Mirroring)** - Writes the same data to two volumes simultaneously. You get redundancy but no performance boost. This is overkill for most use cases since EBS volumes are already replicated within their AZ.

**RAID 5 and RAID 6** - Don't use these on EBS. AWS explicitly recommends against it. The parity write operations consume a significant portion of your IOPS, and the built-in EBS redundancy already handles the use case RAID 5/6 was designed for.

For most people, RAID 0 is the right choice on AWS.

## Step 1: Create and Attach EBS Volumes

First, create the EBS volumes you want to include in your array. You can do this through the console or the CLI.

Create four identical EBS volumes using the AWS CLI:

```bash
# Create 4 gp3 volumes in the same AZ as your instance
for i in 1 2 3 4; do
  aws ec2 create-volume \
    --volume-type gp3 \
    --size 100 \
    --iops 3000 \
    --throughput 125 \
    --availability-zone us-east-1a \
    --tag-specifications "ResourceType=volume,Tags=[{Key=Name,Value=raid-vol-$i}]"
done
```

Wait for all four volumes to become available, then attach them to your instance:

```bash
# Attach volumes to your instance (replace instance ID and volume IDs)
INSTANCE_ID="i-0abc123def456789"

aws ec2 attach-volume --volume-id vol-001 --instance-id $INSTANCE_ID --device /dev/xvdf
aws ec2 attach-volume --volume-id vol-002 --instance-id $INSTANCE_ID --device /dev/xvdg
aws ec2 attach-volume --volume-id vol-003 --instance-id $INSTANCE_ID --device /dev/xvdh
aws ec2 attach-volume --volume-id vol-004 --instance-id $INSTANCE_ID --device /dev/xvdi
```

## Step 2: Verify the Volumes Are Attached

SSH into your instance and confirm all volumes are visible:

```bash
# List all block devices
lsblk

# You should see something like:
# NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
# xvda    202:0    0    8G  0 disk
# ├─xvda1 202:1    0    8G  0 part /
# xvdf    202:80   0  100G  0 disk
# xvdg    202:96   0  100G  0 disk
# xvdh    202:112  0  100G  0 disk
# xvdi    202:128  0  100G  0 disk
```

On Nitro-based instances, the device names might show up as `/dev/nvme1n1`, `/dev/nvme2n1`, etc. Use `nvme list` to map NVMe device names to their EBS volume IDs.

## Step 3: Create the RAID 0 Array

Now we'll use `mdadm` to create the RAID array. Install it first if it's not already available.

Install mdadm and create a RAID 0 array from the four volumes:

```bash
# Install mdadm
sudo yum install -y mdadm  # Amazon Linux
# sudo apt-get install -y mdadm  # Ubuntu

# Create RAID 0 array with 4 devices
sudo mdadm --create /dev/md0 \
    --level=0 \
    --raid-devices=4 \
    /dev/xvdf /dev/xvdg /dev/xvdh /dev/xvdi

# Verify the array was created
sudo mdadm --detail /dev/md0
```

The output of `mdadm --detail` should show your array as active with all four devices. The total size will be the sum of all four volumes (400 GB in this example), and you'll see the stripe size (default is 512K).

For RAID 1 instead, just change the level and device count:

```bash
# Create RAID 1 array with 2 devices (mirroring)
sudo mdadm --create /dev/md0 \
    --level=1 \
    --raid-devices=2 \
    /dev/xvdf /dev/xvdg
```

## Step 4: Create a Filesystem and Mount

With the RAID array created, format it and mount it.

Create an ext4 filesystem on the RAID array and mount it:

```bash
# Create ext4 filesystem (use -E stride and stripe-width for optimal performance)
# stride = chunk_size / block_size = 512K / 4K = 128
# stripe-width = stride * num_data_disks = 128 * 4 = 512
sudo mkfs.ext4 -E stride=128,stripe-width=512 /dev/md0

# Create mount point
sudo mkdir -p /mnt/raid

# Mount the array
sudo mount /dev/md0 /mnt/raid

# Verify it's mounted
df -h /mnt/raid
```

The stride and stripe-width parameters tell the filesystem about the underlying RAID geometry, which helps it align writes for optimal performance.

## Step 5: Make It Persistent

If you stop and start your instance, the RAID array and mount won't come back automatically unless you configure persistence.

Save the RAID configuration and add the mount to fstab:

```bash
# Save the RAID configuration
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm.conf

# On Ubuntu, the config file is /etc/mdadm/mdadm.conf
# sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf

# Get the UUID of the RAID array
sudo blkid /dev/md0

# Add to /etc/fstab using the UUID (replace with your actual UUID)
echo "UUID=your-uuid-here /mnt/raid ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab

# Test the fstab entry
sudo umount /mnt/raid
sudo mount -a

# Verify it mounted correctly
df -h /mnt/raid
```

The `nofail` option is important - it prevents your instance from failing to boot if the RAID array has issues.

## Step 6: Update the initramfs

On some Linux distributions, you need to update the initramfs so the RAID configuration is available at boot time:

```bash
# Amazon Linux / CentOS / RHEL
sudo dracut -H -f /boot/initramfs-$(uname -r).img $(uname -r)

# Ubuntu / Debian
sudo update-initramfs -u
```

## Performance Tuning

Once your RAID array is running, there are a few tweaks to squeeze out more performance.

Tune the read-ahead buffer and scheduler for the RAID array:

```bash
# Increase read-ahead for better sequential read performance
sudo blockdev --setra 65536 /dev/md0

# Check current read-ahead setting
sudo blockdev --getra /dev/md0

# Set the I/O scheduler to none (best for SSDs/EBS)
for dev in xvdf xvdg xvdh xvdi; do
  echo "none" | sudo tee /sys/block/$dev/queue/scheduler
done
```

## Monitoring Your RAID Array

Keeping an eye on your RAID array's health is just as important as setting it up.

Check RAID array status and set up monitoring:

```bash
# Check array status
cat /proc/mdstat

# Detailed status
sudo mdadm --detail /dev/md0

# Set up email notifications for RAID events
sudo mdadm --monitor --mail=admin@example.com --delay=300 /dev/md0 --daemonise
```

For ongoing monitoring of both the RAID performance and the underlying EBS volumes, consider setting up proper [infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-12-benchmark-ec2-instance-performance/view) that tracks I/O metrics continuously.

## When RAID Makes Sense (and When It Doesn't)

RAID 0 on EBS makes sense when:
- You need more IOPS than a single volume provides
- You need more throughput than a single volume delivers
- You're running databases or analytics workloads that are I/O bound

RAID on EBS probably doesn't make sense when:
- A single io2 Block Express volume can meet your needs (up to 256,000 IOPS)
- You could use instance store volumes instead (for temporary, high-performance storage)
- Your workload isn't actually I/O bound

Before going the RAID route, check if a single [io2 Block Express volume](https://oneuptime.com/blog/post/2026-02-12-io2-block-express-ebs-volumes-high-performance-storage/view) might be simpler and just as fast.

## Cleanup

If you need to tear down the RAID array later, here's the proper sequence:

```bash
# Unmount the filesystem
sudo umount /mnt/raid

# Stop the array
sudo mdadm --stop /dev/md0

# Remove superblocks from each device
sudo mdadm --zero-superblock /dev/xvdf
sudo mdadm --zero-superblock /dev/xvdg
sudo mdadm --zero-superblock /dev/xvdh
sudo mdadm --zero-superblock /dev/xvdi

# Remove the fstab entry and mdadm.conf entry
```

RAID on EBS is a powerful technique that's surprisingly straightforward to set up. Just remember to keep your configuration persistent and your monitoring active, and you'll have a reliable high-performance storage layer under your EC2 instances.

# How to Resize a Compute Engine Boot Disk Without Stopping the VM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Disk Resize, Storage, Cloud Operations

Description: A hands-on guide to resizing a Compute Engine boot disk without stopping the VM, including filesystem expansion and important considerations.

---

Running out of disk space on a production VM is one of those problems that needs to be fixed immediately. The good news is that GCP lets you increase the size of a persistent disk while the VM is still running. No downtime, no restart, no maintenance window needed. You just need to resize the disk through GCP and then expand the filesystem from inside the VM.

Let me walk through the process step by step.

## Before You Start

A few important things to know:

- You can only **increase** disk size, never decrease it. Plan accordingly.
- The resize operation itself is usually quick on the GCP side, but expanding the filesystem can take a moment.
- Boot disks created from public Google Cloud images usually resize the root partition and filesystem automatically. Custom Linux images, custom Windows images, and Fedora CoreOS images might need the manual steps below.
- For Windows VMs, the process is slightly different (covered later).
- Always take a snapshot before resizing, just in case.

## Step 1: Take a Safety Snapshot

Even though disk resizing is safe, I always take a snapshot first. It takes a minute and can save you from a very bad day.

```bash
# Create a snapshot of the boot disk before resizing

gcloud compute disks snapshot my-vm \
    --zone=us-central1-a \
    --snapshot-names=my-vm-pre-resize-snapshot
```

## Step 2: Check the Current Disk Size

Let me verify the current disk configuration:

```bash
# Check the current disk size from the GCP side
gcloud compute disks describe my-vm \
    --zone=us-central1-a \
    --format="value(sizeGb)"
```

And from inside the VM:

```bash
# Check disk usage from inside the VM
df -h /
```

You might see something like:

```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       9.8G  7.2G  2.1G  78% /
```

In this example, the boot disk is 10 GB and 78% full. Time to resize.

## Step 3: Resize the Disk

This is the GCP-side operation. It increases the block device size but does not touch the filesystem.

```bash
# Resize the boot disk to 50 GB (VM stays running)
gcloud compute disks resize my-vm \
    --size=50GB \
    --zone=us-central1-a
```

You will get a confirmation prompt. Type `y` to proceed. The resize happens almost instantly.

## Step 4: Expand the Partition and Filesystem

Now SSH into the VM and check whether the partition and filesystem already use the new space. Public Google Cloud images usually do this automatically; if they do not, grow the partition and filesystem manually.

```bash
# SSH into the VM
gcloud compute ssh my-vm --zone=us-central1-a
```

First, check the current partition layout. The examples below assume a SCSI-attached boot disk named `/dev/sda`; NVMe-attached disks use names like `/dev/nvme0n1`.

```bash
# View the partition table
sudo lsblk
```

Output:

```text
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda      8:0    0   50G  0 disk
|-sda1   8:1    0  9.9G  0 part /
|-sda14  8:14   0    4M  0 part
|-sda15  8:15   0  106M  0 part /boot/efi
```

Notice that `sda` is now 50 GB (the disk was resized), but `sda1` is still 9.9 GB (the partition has not grown yet). If your root partition already shows the new size, skip straight to verification.

**For Debian/Ubuntu images**, use `growpart` to expand the partition:

```bash
# Grow the partition to fill the available space
sudo growpart /dev/sda 1

# Resize the ext4 filesystem to match the new partition size
sudo resize2fs /dev/sda1
```

**For CentOS/RHEL images** with XFS:

```bash
# Grow the partition
sudo growpart /dev/sda 1

# Resize the XFS filesystem
sudo xfs_growfs /
```

## Step 5: Verify the Resize

Confirm that the filesystem now has the full 50 GB:

```bash
# Verify the filesystem size
df -h /
```

Expected output:

```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        49G  7.2G   40G  16% /
```

The disk is now 49 GB (50 GB minus some filesystem overhead), and usage has dropped from 78% to 16%.

## Resizing a Windows Boot Disk

For Windows VMs, the disk resize command is the same on the GCP side. Public Windows images usually resize the boot partition automatically, but custom images might need you to expand the partition inside the VM.

```bash
# Resize the Windows VM boot disk
gcloud compute disks resize windows-vm \
    --size=100GB \
    --zone=us-central1-a
```

If the C: drive did not expand automatically, RDP into the Windows VM and use PowerShell:

```powershell
# Get the maximum supported size for the C: partition
$MaxSize = (Get-PartitionSupportedSize -DriveLetter C).SizeMax

# Resize the C: partition to use all available space
Resize-Partition -DriveLetter C -Size $MaxSize
```

Or use Disk Management (diskmgmt.msc) through the GUI:

1. Open Disk Management
2. Right-click on the C: partition
3. Select "Extend Volume"
4. Follow the wizard to use the unallocated space

## Automating Disk Resize with a Script

If you frequently need to resize disks, here is a script that handles the resize for an ext4 boot disk that is named the same as the instance and attached as `/dev/sda`:

```bash
#!/bin/bash
# resize-boot-disk.sh - Resize a Compute Engine boot disk and expand the filesystem
# Usage: ./resize-boot-disk.sh INSTANCE_NAME ZONE NEW_SIZE_GB

INSTANCE=$1
ZONE=$2
NEW_SIZE=$3

if [ -z "$INSTANCE" ] || [ -z "$ZONE" ] || [ -z "$NEW_SIZE" ]; then
    echo "Usage: $0 INSTANCE_NAME ZONE NEW_SIZE_GB"
    exit 1
fi

echo "Taking a safety snapshot..."
gcloud compute disks snapshot "$INSTANCE" \
    --zone="$ZONE" \
    --snapshot-names="${INSTANCE}-pre-resize-$(date +%Y%m%d%H%M%S)"

echo "Resizing disk to ${NEW_SIZE}GB..."
gcloud compute disks resize "$INSTANCE" \
    --size="${NEW_SIZE}GB" \
    --zone="$ZONE" \
    --quiet

echo "Expanding partition and filesystem on the VM..."
gcloud compute ssh "$INSTANCE" --zone="$ZONE" --command="
    sudo growpart /dev/sda 1
    sudo resize2fs /dev/sda1
    df -h /
"

echo "Done. Disk resized to ${NEW_SIZE}GB."
```

## Terraform Approach

In Terraform, manage the boot disk as a separate `google_compute_disk` resource and resize it by updating the disk's `size` parameter. Terraform can then resize the disk in place instead of recreating the instance.

```hcl
resource "google_compute_disk" "my_vm_boot" {
  name  = "my-vm-boot"
  type  = "pd-balanced"
  zone  = "us-central1-a"
  image = "debian-cloud/debian-12"
  size  = 50 # Changed from 10 to 50
}

resource "google_compute_instance" "my_vm" {
  name         = "my-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    source = google_compute_disk.my_vm_boot.self_link
  }

  network_interface {
    network = "default"
  }
}
```

Note that Terraform resizes the disk but does not expand the filesystem on images that do not support automatic boot disk resizing. In that case, you still need to run `growpart` and `resize2fs` inside the VM. You can handle this with a provisioner or a configuration management tool.

## Resizing Data Disks

The process for resizing additional (non-boot) data disks is similar:

```bash
# Resize a data disk
gcloud compute disks resize my-data-disk \
    --size=500GB \
    --zone=us-central1-a

# Then inside the VM, resize the filesystem
# For an ext4 filesystem
sudo resize2fs /dev/sdb

# For an XFS filesystem
sudo xfs_growfs /mnt/data
```

For data disks, you do not need to grow a partition if the filesystem is directly on the block device. If the data disk has a partition table, grow the partition first and then resize the filesystem.

## Performance Implications

Resizing a persistent disk does not just give you more space - it can also improve performance. GCP persistent disk IOPS and throughput scale with disk size:

- **pd-standard**: 0.75 read IOPS per GB, 1.5 write IOPS per GB
- **pd-ssd**: 30 read IOPS per GB, 30 write IOPS per GB
- **pd-balanced**: 6 read IOPS per GB, 6 write IOPS per GB

So a 100 GB pd-ssd gives you 3,000 IOPS, while a 500 GB pd-ssd gives you 15,000 IOPS. If your workload is IOPS-limited, increasing disk size is an easy way to get more performance.

## Monitoring Disk Usage

Set up alerts so you know before a disk fills up. Here is how to create a Cloud Monitoring alert for disk usage:

```bash
# Create an alerting policy for disk usage above 80%
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="High Disk Usage" \
    --condition-display-name="Disk usage above 80%" \
    --condition-filter='resource.type="gce_instance" AND metric.type="agent.googleapis.com/disk/percent_used" AND metric.labels.state="used"' \
    --if='> 80' \
    --duration=60s
```

This requires the Ops Agent or the legacy Cloud Monitoring agent to be installed on your VM.

## Wrapping Up

Resizing a Compute Engine boot disk is one of the most satisfying operations in cloud infrastructure - it is fast, safe, and requires zero downtime. The key steps are: snapshot first, resize the disk through GCP, then expand the partition and filesystem from inside the VM. Make it a habit to set up disk usage monitoring so you catch space issues before they become emergencies. And remember, you can only grow disks, never shrink them, so do not go overboard unless you actually need the space.

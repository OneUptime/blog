# How to Expand the OS Disk on an Azure Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, OS Disk, Disk Expansion, Storage, Azure CLI, Cloud Infrastructure

Description: How to safely expand the OS disk on an Azure virtual machine, including resizing the partition and filesystem on both Linux and Windows.

---

The default OS disk size for most Azure VM images is 30 GB for Linux and 127 GB for Windows. That is often enough to start with, but as your application grows, you may find yourself running low on space. Expanding the OS disk on an Azure VM is a two-step process: first you increase the disk size in Azure, then you extend the partition and filesystem inside the operating system.

This guide covers both steps, for both Linux and Windows VMs.

## Before You Start

There are a few things to keep in mind:

- You can only increase the disk size, never decrease it. Once you expand a disk to 256 GB, you cannot shrink it back to 128 GB.
- The VM must be deallocated before you can expand the OS disk. This means downtime.
- Take a snapshot of the disk before resizing, just in case something goes wrong.
- Make sure your VM size supports the target disk size. Most VM sizes support disks up to 4 TB, but check the documentation if you are going very large.

## Taking a Snapshot First

Always create a snapshot before modifying your OS disk. This gives you a rollback point:

```bash
# Get the OS disk ID
OS_DISK_ID=$(az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query storageProfile.osDisk.managedDisk.id \
  --output tsv)

# Create a snapshot of the current OS disk
az snapshot create \
  --resource-group myResourceGroup \
  --name myVM-osdisk-snapshot \
  --source "$OS_DISK_ID" \
  --location eastus
```

This snapshot captures the exact state of the disk. If the expansion goes sideways, you can create a new disk from the snapshot and swap it in.

## Deallocating the VM

You must stop and deallocate the VM before expanding the OS disk:

```bash
# Deallocate the VM (releases compute resources)
az vm deallocate \
  --resource-group myResourceGroup \
  --name myVM
```

A simple `stop` is not enough. The VM must be fully deallocated so Azure can modify the underlying disk.

## Expanding the Disk in Azure

Now update the disk size. Let us expand it to 128 GB:

```bash
# Expand the OS disk to 128 GB
az disk update \
  --resource-group myResourceGroup \
  --name myVM_OsDisk \
  --size-gb 128
```

You need the actual name of the OS disk, not the VM name. Find it with:

```bash
# Get the OS disk name for the VM
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query storageProfile.osDisk.name \
  --output tsv
```

After the update completes, start the VM back up:

```bash
# Start the VM
az vm start \
  --resource-group myResourceGroup \
  --name myVM
```

At this point, Azure has made the disk larger, but the operating system still sees the old partition size. You need to extend the partition inside the OS.

## Extending the Partition on Linux

SSH into your VM and check the current disk layout:

```bash
# Show all block devices with their sizes and mount points
lsblk
```

You will see something like this:

```
NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda       8:0    0  128G  0 disk
|-sda1    8:1    0 29.9G  0 part /
|-sda14   8:14   0    4M  0 part
|-sda15   8:15   0  106M  0 part /boot/efi
```

Notice that `sda` is 128 GB but `sda1` is only about 30 GB. The extra space is unallocated.

If your VM uses `growpart` (most Azure Linux images include it), extending the partition is simple:

```bash
# Grow partition 1 to fill all available space on sda
sudo growpart /dev/sda 1
```

Then resize the filesystem. For ext4:

```bash
# Resize the ext4 filesystem to match the new partition size
sudo resize2fs /dev/sda1
```

For XFS (used by RHEL and CentOS):

```bash
# Resize the XFS filesystem to fill the partition
sudo xfs_growfs /
```

Verify the change:

```bash
# Check the filesystem size to confirm expansion
df -h /
```

You should now see the full 128 GB (minus a small amount for filesystem overhead and the boot partition).

## Extending the Partition on Windows

Connect to your Windows VM via RDP and open PowerShell as Administrator.

First, check the current disk layout:

```powershell
# List all partitions on disk 0 to see current sizes
Get-Partition -DiskNumber 0
```

You will see the OS partition (usually C:) at its original size, with unallocated space at the end of the disk.

Extend the partition to fill the available space:

```powershell
# Get the maximum supported size for the C: partition
$maxSize = (Get-PartitionSupportedSize -DriveLetter C).SizeMax

# Resize the C: partition to the maximum supported size
Resize-Partition -DriveLetter C -Size $maxSize
```

Verify:

```powershell
# Check the new size of the C: drive
Get-Partition -DriveLetter C | Select-Object DriveLetter, @{Name="SizeGB";Expression={[math]::Round($_.Size/1GB, 2)}}
```

The entire process takes just a few seconds on Windows. No reboot is required for the partition resize inside the OS - that happens live.

## Expanding Without Downtime (Preview)

Azure has been rolling out a feature called "online disk resize" that allows you to expand the OS disk without deallocating the VM. As of this writing, it is available for data disks on most VM types, but OS disk online resize has specific requirements:

- The VM must be running a supported OS version.
- The disk must be a managed disk.
- The feature must be registered for your subscription.

Check if your subscription has the feature:

```bash
# Check if the online resize feature is registered
az feature show \
  --namespace Microsoft.Compute \
  --name LiveResize \
  --query properties.state \
  --output tsv
```

If this feature is available and registered, you can skip the deallocation step and resize the disk while the VM is running. You still need to extend the partition inside the OS afterward.

## Using the Azure Portal

If you prefer the portal:

1. Navigate to your VM and stop (deallocate) it.
2. Go to "Disks" in the left menu.
3. Click on the OS disk name to open the disk resource.
4. Click "Size + performance" in the left menu.
5. Enter the new size and click "Resize."
6. Go back to the VM and start it.
7. Connect to the VM and extend the partition as described above.

## Choosing the Right Disk Size

Azure managed disks come in predefined size tiers, and each tier has specific performance characteristics. For Premium SSDs, a larger disk means more IOPS and throughput:

| Disk Size | Max IOPS | Max Throughput |
|-----------|----------|----------------|
| 32 GB (P4) | 120 | 25 MB/s |
| 64 GB (P6) | 240 | 50 MB/s |
| 128 GB (P10) | 500 | 100 MB/s |
| 256 GB (P15) | 1,100 | 125 MB/s |
| 512 GB (P20) | 2,300 | 150 MB/s |
| 1 TB (P30) | 5,000 | 200 MB/s |

So expanding your disk does not just give you more space - it can also improve disk performance. If you are seeing throttling on a small OS disk, expanding it to 256 GB or 512 GB can make a noticeable difference.

## Troubleshooting Common Issues

**growpart fails with "no space to grow"**: This usually means the partition table does not have free space. Check if there are other partitions after the OS partition that are blocking expansion.

**Partition resize command not found**: Install the `cloud-utils-growpart` package on Ubuntu/Debian or `cloud-utils` on RHEL/CentOS.

**Windows partition cannot be extended**: Make sure there is no recovery partition between the OS partition and the unallocated space. You may need to delete and recreate the recovery partition at the end of the disk.

**Disk size update fails**: Double-check that the VM is fully deallocated (not just stopped). Also verify that the target size is larger than the current size.

## Wrapping Up

Expanding the OS disk is a common maintenance task that every Azure admin encounters eventually. The Azure side of it is quick and painless. The inside-the-OS partition resize is where most people get tripped up, but with `growpart` on Linux and `Resize-Partition` on Windows, it only takes a couple of commands. Always take a snapshot before making changes, and plan for the deallocation downtime. Once you have done it once, you will realize it is one of the more straightforward operations in Azure VM management.

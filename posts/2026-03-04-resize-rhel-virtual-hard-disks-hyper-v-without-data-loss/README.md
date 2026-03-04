# How to Resize RHEL Virtual Hard Disks in Hyper-V Without Data Loss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Hyper-V, Disk Resize, LVM, Storage, Virtualization, Linux

Description: Expand RHEL virtual hard disks (VHDX) in Hyper-V and grow the filesystem inside the guest without losing data or requiring downtime.

---

When a RHEL virtual machine on Hyper-V needs more disk space, you can expand the VHDX file and grow the filesystem from within the guest. This process preserves all existing data.

## Step 1: Expand the VHDX on the Hyper-V Host

You can resize the disk while the VM is running (online resize) on newer Hyper-V versions.

```powershell
# Check the current disk size
Get-VHD -Path "C:\VMs\RHEL9-Server.vhdx" | Select-Object Size, FileSize

# Resize the VHDX to 100 GB
Resize-VHD -Path "C:\VMs\RHEL9-Server.vhdx" -SizeBytes 100GB

# Verify the new size
Get-VHD -Path "C:\VMs\RHEL9-Server.vhdx" | Select-Object Size
```

## Step 2: Detect the New Size in RHEL

```bash
# Rescan the SCSI bus to detect the expanded disk
echo 1 | sudo tee /sys/class/block/sda/device/rescan

# Verify the new disk size
lsblk
# sda should now show the expanded size (e.g., 100G)

# Check the partition table
sudo fdisk -l /dev/sda
```

## Step 3: Grow the Partition

```bash
# Install growpart if not already available
sudo dnf install -y cloud-utils-growpart

# Grow the last partition (typically partition 3 for LVM)
sudo growpart /dev/sda 3

# Verify the partition expanded
lsblk
```

## Step 4: Extend LVM and the Filesystem

```bash
# Resize the physical volume
sudo pvresize /dev/sda3

# Check the volume group for free space
sudo vgs

# Extend the logical volume to use all available space
sudo lvextend -l +100%FREE /dev/mapper/rhel-root

# Grow the XFS filesystem (default on RHEL)
sudo xfs_growfs /

# Verify the new size
df -h /
```

## Complete Example Script

```bash
#!/bin/bash
# resize-disk.sh - Resize RHEL disk after VHDX expansion in Hyper-V

# Rescan the disk to detect the new size
echo 1 | sudo tee /sys/class/block/sda/device/rescan

# Wait for the kernel to update
sleep 2

# Grow the partition
sudo growpart /dev/sda 3

# Resize the physical volume
sudo pvresize /dev/sda3

# Extend the logical volume
sudo lvextend -l +100%FREE /dev/mapper/rhel-root

# Grow the filesystem
sudo xfs_growfs /

# Display the results
echo "Disk resize complete:"
df -h /
sudo vgs
```

## Adding a New Disk Instead

If you prefer to add a separate disk:

```powershell
# On the Hyper-V host, add a new VHDX
New-VHD -Path "C:\VMs\RHEL9-Data.vhdx" -SizeBytes 100GB -Dynamic
Add-VMHardDiskDrive -VMName "RHEL9-Server" -Path "C:\VMs\RHEL9-Data.vhdx"
```

```bash
# In the RHEL guest, detect the new disk
echo "- - -" | sudo tee /sys/class/scsi_host/host*/scan
lsblk

# Create a physical volume on the new disk
sudo pvcreate /dev/sdb

# Add to the existing volume group
sudo vgextend rhel /dev/sdb

# Extend and grow
sudo lvextend -l +100%FREE /dev/mapper/rhel-root
sudo xfs_growfs /
```

Both methods are safe and preserve existing data, giving you flexibility to expand RHEL storage on Hyper-V.

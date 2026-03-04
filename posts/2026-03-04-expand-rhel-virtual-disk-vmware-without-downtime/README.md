# How to Expand a RHEL Virtual Disk in VMware Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VMware, Disk Expansion, LVM, Storage, Linux

Description: Expand a RHEL virtual disk in VMware vSphere and grow the filesystem online without rebooting the virtual machine.

---

When a RHEL VM runs low on disk space in VMware, you can expand the virtual disk and grow the filesystem without downtime. This works when you are using LVM, which is the default RHEL partitioning scheme.

## Step 1: Expand the Virtual Disk in vSphere

1. In the vSphere Client, right-click the VM and select "Edit Settings"
2. Select the hard disk you want to expand
3. Increase the "Provisioned Size" (e.g., from 50 GB to 100 GB)
4. Click OK

Note: The VM does not need to be powered off for this step.

## Step 2: Rescan the SCSI Bus in the Guest

```bash
# Tell the kernel to rescan the SCSI bus to detect the new disk size
echo 1 | sudo tee /sys/class/scsi_device/*/device/rescan

# Verify the new size is detected
lsblk
# The disk (e.g., sda) should now show the expanded size
```

## Step 3: Extend the Partition

If your disk uses a GPT partition table with a single partition:

```bash
# Install growpart if not already available
sudo dnf install -y cloud-utils-growpart

# Grow partition 3 (the LVM partition) to fill the disk
sudo growpart /dev/sda 3

# Verify the partition was extended
lsblk
```

## Step 4: Resize the Physical Volume

```bash
# Resize the LVM physical volume to use the new partition size
sudo pvresize /dev/sda3

# Verify the PV has the new size
sudo pvs
```

## Step 5: Extend the Logical Volume

```bash
# Check available free space in the volume group
sudo vgs

# Extend the logical volume to use all free space
sudo lvextend -l +100%FREE /dev/mapper/rhel-root

# Or extend by a specific amount
# sudo lvextend -L +50G /dev/mapper/rhel-root
```

## Step 6: Grow the Filesystem

```bash
# For XFS (default on RHEL)
sudo xfs_growfs /

# For ext4
# sudo resize2fs /dev/mapper/rhel-root

# Verify the new filesystem size
df -h /
```

## Complete Example

```bash
# Full workflow in one session:
# 1. After expanding the VMDK in vSphere:
echo 1 | sudo tee /sys/class/scsi_device/*/device/rescan
sudo growpart /dev/sda 3
sudo pvresize /dev/sda3
sudo lvextend -l +100%FREE /dev/mapper/rhel-root
sudo xfs_growfs /

# Verify
df -h /
# The root filesystem should now reflect the expanded size
```

## Adding a New Disk Instead

If you prefer to add a new disk rather than expand an existing one:

```bash
# After adding a new disk in vSphere and rescanning:
echo "- - -" | sudo tee /sys/class/scsi_host/host*/scan

# Create a physical volume on the new disk
sudo pvcreate /dev/sdb

# Add it to the existing volume group
sudo vgextend rhel /dev/sdb

# Extend the logical volume and filesystem
sudo lvextend -l +100%FREE /dev/mapper/rhel-root
sudo xfs_growfs /
```

Both approaches work without rebooting the VM, making disk expansion a non-disruptive operation for RHEL on VMware.

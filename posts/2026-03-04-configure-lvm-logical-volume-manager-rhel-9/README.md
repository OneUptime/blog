# How to Configure LVM (Logical Volume Manager) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, Storage, Filesystem, Linux

Description: A comprehensive guide to setting up and managing LVM on RHEL, covering physical volumes, volume groups, and logical volumes.

---

LVM gives you flexible disk management that plain partitions can not provide. You can resize volumes on the fly, span multiple disks, and create snapshots. On RHEL, LVM is the default storage layout, so understanding it is essential.

## LVM Architecture

```mermaid
graph TD
    A[Physical Disks] --> B[Physical Volumes - PV]
    B --> C[Volume Group - VG]
    C --> D[Logical Volume 1]
    C --> E[Logical Volume 2]
    C --> F[Logical Volume 3]
    D --> G[/home]
    E --> H[/var]
    F --> I[swap]
```

LVM has three layers:
- **Physical Volumes (PVs)**: Raw block devices or partitions prepared for LVM
- **Volume Groups (VGs)**: Pools of storage made from one or more PVs
- **Logical Volumes (LVs)**: Virtual partitions carved from a VG

## Installing LVM Tools

LVM tools come pre-installed on RHEL, but verify:

```bash
# Check if LVM is installed
sudo dnf install lvm2 -y
```

## Creating Physical Volumes

Prepare your disks (assuming `/dev/sdb` and `/dev/sdc` are available):

```bash
# Initialize disks as physical volumes
sudo pvcreate /dev/sdb /dev/sdc

# Verify the physical volumes
sudo pvs

# Get detailed info
sudo pvdisplay /dev/sdb
```

## Creating a Volume Group

Combine the physical volumes into a volume group:

```bash
# Create a volume group named 'datavg' from two PVs
sudo vgcreate datavg /dev/sdb /dev/sdc

# Verify the volume group
sudo vgs

# Detailed information
sudo vgdisplay datavg
```

## Creating Logical Volumes

Now create logical volumes from the volume group:

```bash
# Create a 20GB logical volume for data
sudo lvcreate -L 20G -n datalv datavg

# Create a logical volume using 50% of remaining free space
sudo lvcreate -l 50%FREE -n applv datavg

# Create a logical volume using all remaining space
sudo lvcreate -l 100%FREE -n loglv datavg

# List all logical volumes
sudo lvs
```

## Creating Filesystems

Format the logical volumes with a filesystem:

```bash
# Create XFS filesystem (RHEL default)
sudo mkfs.xfs /dev/datavg/datalv

# Create ext4 filesystem
sudo mkfs.ext4 /dev/datavg/applv

# Create XFS on the log volume
sudo mkfs.xfs /dev/datavg/loglv
```

## Mounting Logical Volumes

Create mount points and mount:

```bash
# Create mount points
sudo mkdir -p /data /app /logs

# Mount the volumes
sudo mount /dev/datavg/datalv /data
sudo mount /dev/datavg/applv /app
sudo mount /dev/datavg/loglv /logs

# Verify mounts
df -h /data /app /logs
```

Make the mounts persistent by adding them to `/etc/fstab`:

```bash
# Add entries to fstab
echo '/dev/datavg/datalv /data xfs defaults 0 0' | sudo tee -a /etc/fstab
echo '/dev/datavg/applv /app ext4 defaults 0 0' | sudo tee -a /etc/fstab
echo '/dev/datavg/loglv /logs xfs defaults 0 0' | sudo tee -a /etc/fstab

# Test the fstab entries
sudo mount -a
```

## Viewing LVM Information

```bash
# Summary of all LVM components
sudo pvs    # Physical volumes
sudo vgs    # Volume groups
sudo lvs    # Logical volumes

# Detailed views
sudo pvdisplay
sudo vgdisplay
sudo lvdisplay

# Scan for all LVM devices
sudo lvscan
```

## Removing LVM Components

To cleanly remove LVM components (in reverse order):

```bash
# Unmount the filesystem
sudo umount /data

# Remove the logical volume
sudo lvremove datavg/datalv

# Remove the volume group (after removing all LVs)
sudo vgremove datavg

# Remove physical volumes
sudo pvremove /dev/sdb /dev/sdc
```

## Summary

LVM on RHEL provides the flexibility to manage storage without being constrained by physical disk boundaries. The layered architecture of PVs, VGs, and LVs lets you resize, move, and snapshot your storage as your needs change. This foundation is the starting point for more advanced features like snapshots, thin provisioning, and caching covered in subsequent guides.


# How to Resize a Root Partition on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, Partitioning, Storage, Linux

Description: Learn how to safely resize the root partition on RHEL, whether extending it with additional space or reducing it, using LVM and filesystem tools.

---

Running out of space on the root partition is a common issue in production environments. On RHEL, the root filesystem is typically managed by LVM, which makes resizing straightforward in most cases. This guide covers both extending and reducing the root partition safely.

## Prerequisites

- A RHEL system with root or sudo access
- The root filesystem on an LVM logical volume (the default RHEL installation)
- For extending: available free space in the volume group, or a new disk
- For reducing: a rescue or live boot environment

## Understanding the Root Partition Layout

Check your current layout:

```bash
lsblk
```

Typical RHEL output:

```bash
NAME            MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sda               8:0    0   50G  0 disk
|-sda1            8:1    0    1G  0 part /boot
|-sda2            8:2    0   49G  0 part
  |-rhel-root   253:0    0   45G  0 lvm  /
  |-rhel-swap   253:1    0    4G  0 lvm  [SWAP]
```

Check the filesystem type:

```bash
df -Th /
```

## Extending the Root Partition

### Method 1: Free Space Already in the Volume Group

Check for free space:

```bash
sudo vgs
```

If free space is available, extend the logical volume and filesystem in one step:

```bash
sudo lvextend -r -L +10G /dev/rhel/root
```

The `-r` flag automatically resizes the filesystem after extending the logical volume. This works online without unmounting.

To use all available free space:

```bash
sudo lvextend -r -l +100%FREE /dev/rhel/root
```

### Method 2: Add a New Disk

If no free space is available, add a new disk:

```bash
# Verify the new disk is visible
lsblk

# Create a physical volume
sudo pvcreate /dev/sdb

# Extend the volume group
sudo vgextend rhel /dev/sdb

# Extend the logical volume and filesystem
sudo lvextend -r -L +20G /dev/rhel/root
```

### Method 3: Expand the Underlying Partition

If you expanded the virtual disk in a VM but the partition has not grown:

```bash
# Install growpart if needed
sudo dnf install cloud-utils-growpart -y

# Grow the partition to fill the disk
sudo growpart /dev/sda 2

# Resize the physical volume
sudo pvresize /dev/sda2

# Extend the logical volume
sudo lvextend -r -l +100%FREE /dev/rhel/root
```

### Method 4: Reclaim Space from Swap

If the swap volume is oversized, you can reclaim space:

```bash
# Turn off swap
sudo swapoff /dev/rhel/swap

# Reduce swap logical volume
sudo lvreduce -L 2G /dev/rhel/swap

# Recreate swap
sudo mkswap /dev/rhel/swap

# Turn swap back on
sudo swapon /dev/rhel/swap

# Use freed space for root
sudo lvextend -r -l +100%FREE /dev/rhel/root
```

## Reducing the Root Partition

Reducing the root partition is more complex and carries risk. You must use a rescue environment because you cannot reduce a mounted root filesystem.

**Important**: XFS filesystems cannot be reduced. If your root is XFS (the RHEL default), you cannot shrink it in place. You would need to back up, recreate with a smaller size, and restore. The following steps apply to ext4 root filesystems.

### Step 1: Boot from Rescue Media

Boot from the RHEL installation ISO and select the rescue option, or use a live USB.

### Step 2: Activate LVM

```bash
vgchange -ay
```

### Step 3: Check the Filesystem

```bash
e2fsck -f /dev/rhel/root
```

### Step 4: Reduce the Filesystem

```bash
resize2fs /dev/rhel/root 30G
```

### Step 5: Reduce the Logical Volume

```bash
lvreduce -L 30G /dev/rhel/root
```

### Step 6: Verify and Reboot

```bash
e2fsck -f /dev/rhel/root
reboot
```

## Verifying the Resize

After extending, verify the new size:

```bash
df -h /
sudo lvs /dev/rhel/root
```

Check that the system is healthy:

```bash
sudo systemctl is-system-running
```

## Handling XFS Root Filesystems

Since XFS is the default filesystem on RHEL and cannot be reduced, here are your options when you need to shrink the root:

1. **Extend instead**: Add more storage rather than trying to shrink root.
2. **Backup and recreate**: Back up the root filesystem, delete and recreate the logical volume at a smaller size, format with XFS, and restore.
3. **Reinstall**: For major restructuring, a fresh installation with the desired partition sizes may be the cleanest approach.

For the backup and recreate approach:

```bash
# From rescue environment
mkdir /mnt/backup /mnt/root
mount /dev/sdc1 /mnt/backup  # External backup drive
mount /dev/rhel/root /mnt/root

# Back up
tar czf /mnt/backup/root_backup.tar.gz -C /mnt/root .

# Unmount, remove, recreate
umount /mnt/root
lvremove /dev/rhel/root
lvcreate -L 20G -n root rhel
mkfs.xfs /dev/rhel/root

# Restore
mount /dev/rhel/root /mnt/root
tar xzf /mnt/backup/root_backup.tar.gz -C /mnt/root

# Reinstall bootloader
mount /dev/sda1 /mnt/root/boot
chroot /mnt/root
grub2-install /dev/sda
grub2-mkconfig -o /boot/grub2/grub.cfg
dracut -f
exit
reboot
```

## Best Practices

- **Always back up before reducing**: Shrinking operations carry a risk of data loss.
- **Use LVM thin provisioning**: For better space management, consider thin provisioning for new logical volumes.
- **Monitor disk usage**: Set up alerts before the root filesystem reaches critical levels.
- **Leave headroom**: When planning partition sizes, leave at least 10-20% free space for system operations.

## Conclusion

Extending the root partition on RHEL is a straightforward online operation when using LVM. The `lvextend -r` command handles both the logical volume and filesystem resize in one step. Reducing the root partition is more complex, especially with XFS, and requires careful planning and a rescue environment. Always maintain backups before performing any partition resize operations.

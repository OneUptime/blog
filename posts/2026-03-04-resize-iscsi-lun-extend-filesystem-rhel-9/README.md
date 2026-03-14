# How to Resize an iSCSI LUN and Extend the File System on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ISCSI, LUN Resize, File Systems, Storage, Linux

Description: Resize an iSCSI LUN on the target and extend the file system on the initiator on RHEL without downtime.

---

When an iSCSI LUN runs out of space, you can resize it on the target and then extend the file system on the initiator. This can be done online (while the file system is mounted) for XFS and ext4, avoiding downtime.

## Resizing on the Target Side

### LVM-Backed LUN

If the LUN is backed by an LVM logical volume:

```bash
# Extend the logical volume
sudo lvextend -L +50G /dev/vg_iscsi/lun_web

# Or extend to a specific size
sudo lvextend -L 150G /dev/vg_iscsi/lun_web
```

### File-Backed LUN

For fileio backstores, resize in targetcli:

```bash
sudo targetcli
cd /backstores/fileio/lun0
# View current size
info
```

You may need to recreate the backstore with a larger file:

```bash
# Extend the backing file
sudo truncate -s 100G /var/iscsi/lun0.img

# In targetcli, the backstore should reflect the new size
```

### Block Device Resize

If the block device itself has been expanded (e.g., a virtual disk in a VM):

```bash
# No target-side action needed beyond the device expansion
# The LIO target automatically reflects the new size
```

## Notifying the Initiator

After resizing the LUN on the target, the initiator needs to detect the new size.

### Method 1: Rescan the Session

```bash
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 --rescan
```

### Method 2: Rescan SCSI Devices

```bash
# Find the SCSI host number for the iSCSI session
sudo iscsiadm -m session -P 3 | grep "Host Number"

# Rescan that host
echo 1 | sudo tee /sys/class/scsi_host/host3/scan

# Or rescan the specific device
echo 1 | sudo tee /sys/class/scsi_device/3\:0\:0\:0/device/rescan
```

### Method 3: With Multipath

If using DM-Multipath:

```bash
# Rescan all iSCSI sessions
sudo iscsiadm -m session --rescan

# Resize the multipath device
sudo multipathd resize map mpatha
```

## Verify the New Size

```bash
# Check the block device size
lsblk

# If using multipath
sudo multipath -ll
```

## Extending the File System

### For XFS

XFS can only grow, not shrink, and only while mounted:

```bash
# Extend to use all available space
sudo xfs_growfs /mnt/iscsi
```

### For ext4

ext4 can be resized online:

```bash
# If no partition table, extend directly
sudo resize2fs /dev/sdb

# If using a partition, grow the partition first
sudo growpart /dev/sdb 1
sudo resize2fs /dev/sdb1
```

### With LVM on the Initiator

If the initiator uses LVM on top of the iSCSI disk:

```bash
# Resize the physical volume to detect new space
sudo pvresize /dev/sdb

# Extend the logical volume
sudo lvextend -l +100%FREE /dev/myvg/mylv

# Extend the file system
sudo xfs_growfs /mount/point     # For XFS
sudo resize2fs /dev/myvg/mylv    # For ext4
```

## Complete Example

Here is the full workflow:

```bash
# 1. On the target: extend the LVM backing the LUN
sudo lvextend -L +50G /dev/vg_iscsi/lun_web

# 2. On the initiator: rescan the iSCSI session
sudo iscsiadm -m node -T iqn.2024.com.example:target1 --rescan

# 3. Verify the new size is detected
lsblk /dev/sdb

# 4. Extend the file system
sudo xfs_growfs /mnt/iscsi

# 5. Verify
df -h /mnt/iscsi
```

## Troubleshooting

### New size not detected after rescan

```bash
# Force device rescan
echo "- - -" | sudo tee /sys/class/scsi_host/host3/scan

# Check kernel messages
sudo dmesg | tail -20
```

### Multipath not updating

```bash
# Rescan all paths
sudo iscsiadm -m session --rescan

# Reload multipath maps
sudo multipathd reconfigure
sudo multipath -r
```

## Conclusion

Resizing iSCSI LUNs is a routine operation that can be performed online. The process is: expand the storage on the target, rescan on the initiator, then extend the file system. Using LVM on both the target and initiator sides provides the most flexibility for storage management.

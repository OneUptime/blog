# How to Resize a Multipath Device and Rescan Paths on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DM-Multipath, Resize, Storage, Linux

Description: Resize a multipath device on RHEL after the underlying SAN LUN has been expanded, including rescanning paths and extending file systems.

---

When a SAN LUN is expanded on the storage array, the multipath device on the host does not automatically detect the new size. You need to rescan the SCSI paths, resize the multipath device, and then extend any file systems or LVM volumes on top of it.

## Step 1: Expand the LUN on the Storage Array

This step is done on the storage array management interface (not on the RHEL host). The exact procedure depends on your array vendor.

## Step 2: Rescan All Paths

Rescan each SCSI path so the host detects the new LUN size:

```bash
# Find all SCSI devices for the multipath device
sudo multipath -ll mpatha

# Rescan each path device
for dev in sdb sdc sdd sde; do
    echo 1 | sudo tee /sys/block/$dev/device/rescan
done
```

Or rescan all SCSI hosts:

```bash
for host in /sys/class/scsi_host/host*; do
    echo "- - -" | sudo tee "$host/scan"
done
```

For iSCSI paths:

```bash
sudo iscsiadm -m session --rescan
```

## Step 3: Verify the New Size on Individual Paths

```bash
# Check each path device
lsblk sdb sdc sdd sde

# Or check via sysfs
cat /sys/block/sdb/size
cat /sys/block/sdc/size
```

All paths should show the new size.

## Step 4: Resize the Multipath Device

```bash
sudo multipathd resize map mpatha
```

Verify:

```bash
sudo multipath -ll mpatha
```

The size should now reflect the expanded LUN.

```bash
# Also check with lsblk
lsblk /dev/mapper/mpatha
```

## Step 5: Extend the File System

### Direct File System (No LVM)

For XFS:

```bash
sudo xfs_growfs /mount/point
```

For ext4:

```bash
sudo resize2fs /dev/mapper/mpatha
```

### With LVM

If LVM is on top of the multipath device:

```bash
# Resize the physical volume
sudo pvresize /dev/mapper/mpatha

# Verify the VG has new free space
sudo vgs

# Extend the logical volume
sudo lvextend -l +100%FREE /dev/vg_name/lv_name

# Extend the file system
sudo xfs_growfs /mount/point          # For XFS
# or
sudo resize2fs /dev/vg_name/lv_name   # For ext4
```

### With a Partition Table

If the multipath device has a partition table:

```bash
# Resize the partition (using growpart or parted)
sudo growpart /dev/mapper/mpatha 1

# Then extend the file system on the partition
sudo xfs_growfs /mount/point
```

## Automated Script

```bash
#!/bin/bash
MPATH_DEV="$1"

if [ -z "$MPATH_DEV" ]; then
    echo "Usage: $0 <multipath_device_name>"
    exit 1
fi

echo "Resizing multipath device: $MPATH_DEV"

# Get path devices
PATHS=$(sudo multipathd show paths format "%d %m" | grep "$MPATH_DEV" | awk '{print $1}')

echo "Rescanning paths: $PATHS"
for dev in $PATHS; do
    echo 1 | sudo tee /sys/block/$dev/device/rescan > /dev/null
    echo "  Rescanned $dev"
done

echo "Resizing multipath map..."
sudo multipathd resize map "$MPATH_DEV"

echo "New size:"
sudo multipath -ll "$MPATH_DEV" | head -2

echo "Done. Extend file system or LVM as needed."
```

## Troubleshooting

### Not All Paths Show New Size

Some paths may not update immediately:

```bash
# Check individual path sizes
for dev in sdb sdc sdd sde; do
    echo "$dev: $(cat /sys/block/$dev/size) blocks"
done

# Re-rescan the lagging paths
echo 1 | sudo tee /sys/block/sdc/device/rescan
```

### multipathd resize fails

```bash
# Check multipathd logs
sudo journalctl -u multipathd | tail -20

# Try reconfiguring
sudo multipathd reconfigure

# Force flush and rediscover (caution: unmount first)
sudo multipath -F
sudo multipath -v2
```

### Size Not Reflected After Resize

```bash
# Check if the partition table needs updating
sudo partprobe /dev/mapper/mpatha

# Check if a device-mapper table refresh is needed
sudo dmsetup table /dev/mapper/mpatha
```

## Conclusion

Resizing a multipath device after a SAN LUN expansion follows a clear sequence: rescan the individual paths, resize the multipath map, then extend whatever is on top (partitions, LVM, file systems). The process is online and does not require downtime. Always verify each step completes before moving to the next.

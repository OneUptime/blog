# How to Set Up udisks2 for Disk Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, Disk Management, udisks2, System Administration

Description: Learn how to install and use udisks2 on Ubuntu to manage disks, mount and unmount filesystems, query disk information, and automate storage tasks from the command line.

---

udisks2 is a D-Bus service that provides a standardized interface for managing storage devices on Linux. Desktop environments like GNOME use it under the hood to handle automatic mounting of USB drives and disk management. But udisks2 is equally useful from the command line on headless servers, providing a clean interface to query disk information, mount filesystems, format partitions, and manage power settings - all without needing root for many operations when properly configured.

## Installing udisks2 on Ubuntu

udisks2 is usually installed by default on Ubuntu desktop systems. On server installations, you may need to install it:

```bash
# Update package lists
sudo apt-get update

# Install udisks2 and the command-line interface
sudo apt-get install -y udisks2

# Verify installation
udisksctl --version

# Check that the service is running
systemctl status udisks2
```

If the service isn't running, start it:

```bash
# Start and enable the udisks2 service
sudo systemctl enable --now udisks2
```

## Querying Disk Information

The `udisksctl` command is the primary interface to udisks2. Start by getting an overview of attached block devices.

```bash
# List all block devices managed by udisks2
udisksctl status
```

For detailed information about a specific device:

```bash
# Get comprehensive information about /dev/sdb
udisksctl info -b /dev/sdb
```

This outputs drive model, serial number, size, partition table type, filesystem types, mount points, and SMART status in a structured format.

### Getting Drive Information

```bash
# Query the parent drive (not partition) for hardware details
udisksctl info -b /dev/sdb

# Check SMART data for a drive
udisksctl smart-simulate -b /dev/sda

# List all managed objects (drives, block devices, partitions)
udisksctl dump
```

The `dump` command outputs everything udisks2 knows about all attached storage, which is useful for scripting.

## Mounting and Unmounting Filesystems

udisks2 allows non-root users to mount and unmount devices, which is one of its main advantages for desktop users. On servers, this is still useful for managing removable media.

```bash
# Mount a partition (as a regular user, no sudo needed if properly configured)
udisksctl mount -b /dev/sdb1

# Unmount by device
udisksctl unmount -b /dev/sdb1
```

When udisks2 mounts a device, it creates a mount point under `/run/media/<username>/` and reports the exact path.

### Mount with Specific Options

```bash
# Mount with specific filesystem options
udisksctl mount -b /dev/sdb1 -o ro  # Read-only mount

# Mount an NFS or other special filesystem type
udisksctl mount -b /dev/sdc1 -t ext4
```

### Loop Mounts for ISO Files

udisks2 handles loop device management for ISO images:

```bash
# Set up a loop device for an ISO image
udisksctl loop-setup -f /path/to/image.iso

# The command returns the loop device path, e.g., /dev/loop0
# Then mount it
udisksctl mount -b /dev/loop0

# When done, delete the loop device
udisksctl loop-delete -b /dev/loop0
```

## Formatting Partitions

udisks2 can format partitions with various filesystems. This is destructive, so double-check the device before running.

```bash
# Format /dev/sdb1 as ext4 with a label
udisksctl format /dev/sdb1 -t ext4 --no-user-interaction -- -L "DataDisk"

# Format as FAT32 (useful for USB drives)
udisksctl format /dev/sdb1 -t vfat --no-user-interaction -- -n "USBDISK"

# Format as NTFS
sudo apt-get install -y ntfs-3g  # Install NTFS support first
udisksctl format /dev/sdb1 -t ntfs --no-user-interaction
```

## Power Management

For removable drives and SSDs, udisks2 provides power management commands.

```bash
# Safely power off a drive (spins it down and prepares for removal)
udisksctl power-off -b /dev/sdb

# Check SMART status (requires smartmontools)
sudo apt-get install -y smartmontools
udisksctl smart-simulate -b /dev/sda
```

## Using udisks2 in Scripts

The real value of udisks2 in server environments is programmatic access. You can query it via D-Bus directly or use `udisksctl` with parseable output.

### Bash Script: Auto-Mount and Backup

```bash
#!/bin/bash
# /usr/local/bin/backup-to-usb.sh
# Mounts a USB drive identified by label and runs backup

DEVICE_LABEL="BACKUP-USB"
BACKUP_SOURCE="/home"
LOG_FILE="/var/log/usb-backup.log"

# Find device by label
DEVICE=$(blkid -L "$DEVICE_LABEL" 2>/dev/null)

if [[ -z "$DEVICE" ]]; then
    echo "$(date): Device with label '$DEVICE_LABEL' not found" >> "$LOG_FILE"
    exit 1
fi

echo "$(date): Found device $DEVICE" >> "$LOG_FILE"

# Mount via udisksctl
MOUNT_OUTPUT=$(udisksctl mount -b "$DEVICE" 2>&1)
MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | grep -oP 'at \K.*')

if [[ -z "$MOUNT_POINT" ]]; then
    # Device may already be mounted
    MOUNT_POINT=$(lsblk -no MOUNTPOINT "$DEVICE")
fi

echo "$(date): Mounted at $MOUNT_POINT" >> "$LOG_FILE"

# Run backup
rsync -av --delete "$BACKUP_SOURCE/" "$MOUNT_POINT/backup/" >> "$LOG_FILE" 2>&1
RSYNC_EXIT=$?

# Unmount after backup
sync
udisksctl unmount -b "$DEVICE"
udisksctl power-off -b "${DEVICE%[0-9]}"  # Power off the parent drive

if [[ $RSYNC_EXIT -eq 0 ]]; then
    echo "$(date): Backup completed successfully" >> "$LOG_FILE"
else
    echo "$(date): Backup failed with exit code $RSYNC_EXIT" >> "$LOG_FILE"
    exit 1
fi
```

### Python Script: Query Disk Info via D-Bus

```python
#!/usr/bin/env python3
# query-disks.py - Query udisks2 via D-Bus for disk information

import dbus
import json

def get_udisks2_info():
    bus = dbus.SystemBus()
    udisks = bus.get_object('org.freedesktop.UDisks2', '/org/freedesktop/UDisks2')

    # Get all managed objects
    obj_manager = dbus.Interface(udisks, 'org.freedesktop.DBus.ObjectManager')
    managed_objects = obj_manager.GetManagedObjects()

    disks = []
    for path, interfaces in managed_objects.items():
        if 'org.freedesktop.UDisks2.Drive' in interfaces:
            drive = interfaces['org.freedesktop.UDisks2.Drive']
            disks.append({
                'path': str(path),
                'model': str(drive.get('Model', '')),
                'serial': str(drive.get('Serial', '')),
                'size': int(drive.get('Size', 0)),
                'removable': bool(drive.get('Removable', False)),
                'rotation_rate': int(drive.get('RotationRate', -1))
            })

    return disks

if __name__ == '__main__':
    disks = get_udisks2_info()
    print(json.dumps(disks, indent=2))
```

Install the required Python D-Bus library:

```bash
sudo apt-get install -y python3-dbus
python3 query-disks.py
```

## Configuring udisks2 Policies

udisks2 uses polkit for authorization. You can configure which users can perform specific actions without sudo.

```bash
# View current polkit rules for udisks2
ls /usr/share/polkit-1/actions/ | grep udisks

# Create a custom rule to allow a specific group to mount all drives
sudo tee /etc/polkit-1/rules.d/10-udisks2-allow-mount.rules << 'EOF'
// Allow users in the 'storage' group to mount/unmount drives
polkit.addRule(function(action, subject) {
    if (action.id.indexOf("org.freedesktop.udisks2") == 0 &&
        subject.isInGroup("storage")) {
        return polkit.Result.YES;
    }
});
EOF

# Create the storage group and add a user
sudo groupadd storage
sudo usermod -aG storage ubuntu
```

## Monitoring Disk Events with udev

udisks2 works alongside udev to react to disk attachment events. Create a udev rule that triggers when a specific USB drive is connected:

```bash
# First, find the drive's vendor and product ID
lsusb

# Create a udev rule for the device
sudo tee /etc/udev/rules.d/90-backup-usb.rules << 'EOF'
# Run backup script when BACKUP-USB drive is connected
SUBSYSTEM=="block", ENV{ID_FS_LABEL}=="BACKUP-USB", ACTION=="add", RUN+="/usr/local/bin/backup-to-usb.sh"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Troubleshooting Common Issues

**Permission denied when mounting as non-root:**

```bash
# Check if user is in the correct groups
groups $USER

# Add user to the disk group if needed
sudo usermod -aG disk $USER

# Re-login for group changes to take effect
```

**Device not appearing in udisksctl status:**

```bash
# Check if udisks2 daemon is running
systemctl status udisks2

# Check kernel logs for device detection issues
dmesg | grep -E "sd[a-z]|usb" | tail -20
```

**Mount point cleanup after crash:**

```bash
# If udisks2 thinks a device is mounted but isn't
udisksctl unmount -b /dev/sdb1 --force
```

udisks2 is a solid foundation for storage management on Ubuntu, particularly when you need consistent disk operations from scripts or want to give non-root users controlled access to storage operations without broad sudo privileges.

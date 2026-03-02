# How to Set Up USB Automounting on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, System Administration, Automation

Description: Configure automatic USB drive mounting on Ubuntu Server using udev rules and systemd to handle USB storage devices without manual intervention.

---

Ubuntu Desktop automounts USB drives automatically through GNOME's volume management. Ubuntu Server does not - it is headless, has no desktop session, and you are expected to mount drives manually with `mount`. For most server use cases that is fine, but there are legitimate scenarios where automounting makes sense: network-attached storage systems that accept backup drives, media servers that ingest files when a drive is inserted, industrial systems that pull data from USB devices, or air-gapped environments where operators swap drives to transfer files.

This guide covers automounting with `udev` rules and `systemd` mount units, which is the robust, non-desktop approach.

## How USB Automounting Works

When a USB device is inserted, the Linux kernel detects it and the `udev` daemon processes device events. `udev` can execute rules that trigger actions - including running scripts or starting systemd services - in response to device events. The `automount` subsystem in systemd can then handle the actual mounting.

The two main approaches are:

1. **udev rules + shell script** - Flexible, runs arbitrary code on device insertion
2. **systemd automount units** - Cleaner for known/fixed devices, declarative configuration

## Approach 1: udev Rules with a Mount Script

This approach works well when you want to mount any USB drive that appears, regardless of its device name.

### Step 1: Install Required Packages

```bash
sudo apt update
sudo apt install usbutils udisks2 -y
```

`usbutils` provides `lsusb` for debugging. `udisks2` provides a D-Bus interface and the `udisksctl` command that can mount drives without root.

### Step 2: Create a Mount Script

```bash
sudo nano /usr/local/bin/usb-mount.sh
```

```bash
#!/bin/bash
# USB automount script
# Called by udev when a USB storage device is added or removed
# Arguments: ACTION (add/remove) DEVNAME (/dev/sdb1)

ACTION="$1"
DEVNAME="$2"
MOUNT_BASE="/media/usb"
LOG="/var/log/usb-mount.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"
}

case "$ACTION" in
    add)
        # Wait briefly for the device to settle
        sleep 2

        # Check if it is already mounted
        if grep -q "$DEVNAME" /proc/mounts; then
            log "Device $DEVNAME already mounted, skipping"
            exit 0
        fi

        # Get filesystem type
        FSTYPE=$(blkid -o value -s TYPE "$DEVNAME" 2>/dev/null)

        if [ -z "$FSTYPE" ]; then
            log "Could not determine filesystem type for $DEVNAME"
            exit 1
        fi

        # Create a mount point based on the device label or device name
        LABEL=$(blkid -o value -s LABEL "$DEVNAME" 2>/dev/null)
        if [ -n "$LABEL" ]; then
            MOUNT_POINT="${MOUNT_BASE}/${LABEL}"
        else
            # Use a sanitized device name (e.g., sdb1)
            DEVBASE=$(basename "$DEVNAME")
            MOUNT_POINT="${MOUNT_BASE}/${DEVBASE}"
        fi

        mkdir -p "$MOUNT_POINT"

        # Mount based on filesystem type
        case "$FSTYPE" in
            vfat|fat32)
                mount -t vfat -o uid=1000,gid=1000,umask=002 "$DEVNAME" "$MOUNT_POINT"
                ;;
            ntfs|ntfs-3g)
                mount -t ntfs-3g -o uid=1000,gid=1000,umask=002 "$DEVNAME" "$MOUNT_POINT"
                ;;
            exfat)
                mount -t exfat -o uid=1000,gid=1000,umask=002 "$DEVNAME" "$MOUNT_POINT"
                ;;
            ext4|ext3|ext2)
                mount -t "$FSTYPE" "$DEVNAME" "$MOUNT_POINT"
                ;;
            *)
                log "Unknown filesystem type $FSTYPE on $DEVNAME"
                rmdir "$MOUNT_POINT" 2>/dev/null
                exit 1
                ;;
        esac

        if [ $? -eq 0 ]; then
            log "Mounted $DEVNAME ($FSTYPE) at $MOUNT_POINT"
        else
            log "Failed to mount $DEVNAME at $MOUNT_POINT"
            rmdir "$MOUNT_POINT" 2>/dev/null
        fi
        ;;

    remove)
        # Find and unmount any mount point using this device
        MOUNT_POINT=$(grep "$DEVNAME" /proc/mounts | awk '{print $2}')

        if [ -n "$MOUNT_POINT" ]; then
            umount "$MOUNT_POINT"
            log "Unmounted $DEVNAME from $MOUNT_POINT"
            rmdir "$MOUNT_POINT" 2>/dev/null
        else
            log "Device $DEVNAME was not mounted"
        fi
        ;;
esac
```

```bash
sudo chmod +x /usr/local/bin/usb-mount.sh
sudo mkdir -p /media/usb
sudo mkdir -p /var/log
```

### Step 3: Create the udev Rule

```bash
sudo nano /etc/udev/rules.d/99-usb-automount.rules
```

```
# Automount USB storage devices when added
# Match USB mass storage partitions
ACTION=="add", KERNEL=="sd[b-z][0-9]", SUBSYSTEMS=="usb", RUN+="/usr/local/bin/usb-mount.sh add %N"

# Unmount USB storage devices when removed
ACTION=="remove", KERNEL=="sd[b-z][0-9]", SUBSYSTEMS=="usb", RUN+="/usr/local/bin/usb-mount.sh remove %N"
```

The `KERNEL=="sd[b-z][0-9]"` pattern matches partitions on any SCSI disk from sdb onward (excluding sda which is typically the system disk). `SUBSYSTEMS=="usb"` ensures we only match USB-connected devices.

### Step 4: Reload udev Rules

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Step 5: Install NTFS and exFAT Support

For drives formatted with Windows filesystems:

```bash
sudo apt install ntfs-3g exfatprogs -y
```

### Testing the udev Rule

Insert a USB drive and watch the log:

```bash
tail -f /var/log/usb-mount.log
```

For debugging, check what udev sees when the device is inserted:

```bash
# Monitor udev events in real time
sudo udevadm monitor --subsystem-match=block

# Check what the device attributes look like
sudo udevadm info -a -n /dev/sdb1
```

## Approach 2: udisksctl for Non-Root Mounting

For scenarios where a non-root user should be able to manage USB drives, `udisks2` provides a clean interface:

```bash
# Mount a USB drive (no sudo required for users in the appropriate group)
udisksctl mount -b /dev/sdb1

# Unmount
udisksctl unmount -b /dev/sdb1

# Power off the USB device (safe removal)
udisksctl power-off -b /dev/sdb
```

To allow a service user to use udisksctl, add them to the `disk` group:

```bash
sudo usermod -aG disk serviceuser
```

## Approach 3: usbmount Package

`usbmount` is a simple package specifically designed for USB automounting:

```bash
sudo apt install usbmount -y
```

Configure it:

```bash
sudo nano /etc/usbmount/usbmount.conf
```

```bash
# Filesystem types to mount
FILESYSTEMS="vfat ext2 ext3 ext4 hfsplus ntfs-3g exfat"

# Mount options
MOUNTOPTIONS="sync,noexec,nodev,noatime,nodiratime"

# Mount options per filesystem type
FS_MOUNTOPTIONS="-fstype=vfat,uid=1000,gid=1000 -fstype=ntfs-3g,uid=1000,gid=1000"
```

`usbmount` mounts drives at `/media/usb0`, `/media/usb1`, etc. It is simpler than the custom udev approach but less flexible.

Note: `usbmount` has compatibility issues with newer systemd versions. Check whether it works on your Ubuntu version before relying on it in production.

## Security Considerations

Automounting USB drives on a server carries security risks:

### Restrict to Specific Devices

Rather than mounting any USB drive, whitelist specific devices by vendor ID, product ID, or serial number:

```bash
# Get device identifiers
lsusb
# or
udevadm info -a -n /dev/sdb | grep -E 'idVendor|idProduct|serial'
```

Update the udev rule to match only trusted devices:

```
# Only mount this specific USB device (by vendor and product ID)
ACTION=="add", KERNEL=="sd[b-z][0-9]", SUBSYSTEMS=="usb", \
  ATTRS{idVendor}=="0781", ATTRS{idProduct}=="5583", \
  RUN+="/usr/local/bin/usb-mount.sh add %N"
```

### Mount with noexec

Always include `noexec` in mount options to prevent execution of programs from untrusted USB drives:

```bash
mount -o noexec,nosuid,nodev /dev/sdb1 /media/usb/drive1
```

### Run a Post-Mount Script

After mounting, automatically process or scan the drive:

```bash
# At the end of the mount success block in usb-mount.sh
# Run antivirus scan or data ingestion
/usr/local/bin/process-usb-drive.sh "$MOUNT_POINT" &
```

## Logging and Monitoring

Track USB mount events for audit purposes:

```bash
# View recent USB-related kernel messages
dmesg | grep -i usb | tail -20

# View the mount log
tail -50 /var/log/usb-mount.log

# Check currently mounted USB devices
grep "usb" /proc/mounts
```

For production environments, integrate USB mount events with your monitoring platform. Forward the log file to your logging stack or use [OneUptime](https://oneuptime.com) to alert on unusual patterns, such as USB drives appearing outside of maintenance windows.

## Unmounting Safely Before Removal

Always unmount before physically removing the drive to avoid data corruption:

```bash
# Unmount a specific device
sudo umount /dev/sdb1

# Or unmount by mount point
sudo umount /media/usb/my-drive

# Sync all pending writes before unmounting
sync && sudo umount /dev/sdb1

# Power off the USB device for safe removal
sudo udisksctl power-off -b /dev/sdb
```

## Summary

USB automounting on Ubuntu Server requires manual setup since the server edition has no desktop session management. The udev rules approach with a mount script is the most flexible method, handling any USB drive that appears and supporting multiple filesystem types. Lock down automounting with device whitelisting and `noexec` mount options for any server exposed to untrusted physical media, and log all mount events for audit purposes.

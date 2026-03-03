# How to Use the lsblk, blkid, and mount Commands on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Storage, System Administration, Command Line

Description: Learn how to use lsblk, blkid, and mount on Ubuntu to inspect block devices, identify filesystems by UUID, and mount storage devices manually and persistently.

---

Managing disks and filesystems on Ubuntu requires understanding three closely related commands: `lsblk` shows the structure of block devices, `blkid` reveals filesystem identifiers, and `mount` attaches filesystems to the directory tree. Together they cover the complete workflow from identifying a disk to making it accessible.

## lsblk - List Block Devices

`lsblk` reads from the kernel's sysfs and udev database to display block devices in a tree structure. No root privileges are required.

```bash
# Basic output
lsblk
```

Typical output:
```text
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sda      8:0    0   500G  0 disk
├─sda1   8:1    0   512M  0 part /boot/efi
├─sda2   8:2    0     1G  0 part /boot
└─sda3   8:3    0 498.5G  0 part /
sdb      8:16   0     2T  0 disk
└─sdb1   8:17   0     2T  0 part /data
sr0     11:0    1  1024M  0 rom
```

### Useful lsblk Options

```bash
# Show all devices including empty ones (no mountpoint)
lsblk -a

# Show filesystem information
lsblk -f

# Show UUID, LABEL, FSTYPE
lsblk -o NAME,UUID,LABEL,FSTYPE,SIZE,MOUNTPOINT

# Show device model and serial numbers
lsblk -o NAME,MODEL,SERIAL,SIZE

# Output in JSON for scripting
lsblk -J

# Show paths instead of names
lsblk -p

# Show only disks and their partitions (exclude loop devices)
lsblk -e 7

# Show disk sizes in bytes
lsblk -b
```

### Reading lsblk Output

```bash
# Full column selection for disk auditing
lsblk -o NAME,MAJ:MIN,RM,SIZE,RO,TYPE,MOUNTPOINT,FSTYPE,UUID
```

Column meanings:
- `RM` - 1 if removable (USB drives, SD cards)
- `RO` - 1 if read-only
- `TYPE` - disk, part, lvm, rom, crypt

## blkid - Block Device Identifier

`blkid` probes block devices and reports their filesystem types, UUIDs, and labels. Most operations require root.

```bash
# Show all block devices with identifiers
sudo blkid

# Show info for a specific device
sudo blkid /dev/sdb1

# Example output:
# /dev/sdb1: UUID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" TYPE="ext4" PARTUUID="12345678-01"
```

### Querying by UUID or Label

```bash
# Find device by UUID
sudo blkid -U "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Find device by label
sudo blkid -L "MyData"

# Show only a specific tag value
sudo blkid -o value -s UUID /dev/sdb1
# Outputs just: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Output Formats

```bash
# Default output (key="value" pairs)
sudo blkid /dev/sda1

# Export format (KEY=value, shell-sourceable)
sudo blkid -o export /dev/sda1

# Udev format
sudo blkid -o udev /dev/sda1

# Full format with all fields
sudo blkid -o full /dev/sda1
```

## mount - Attach Filesystems

`mount` makes a filesystem accessible at a specified directory (mount point).

### Viewing Current Mounts

```bash
# Show all mounted filesystems
mount

# Readable format with type filtering
mount | grep -v "tmpfs\|devtmpfs\|cgroup"

# Modern alternative - findmnt
findmnt

# Show specific mount
findmnt /data

# Show all mounts in tree view
findmnt --tree
```

### Mounting a Device

```bash
# Create a mount point directory
sudo mkdir -p /mnt/mydata

# Mount a partition
sudo mount /dev/sdb1 /mnt/mydata

# Verify it mounted
df -h /mnt/mydata
lsblk | grep mydata
```

### Specifying Filesystem Type

```bash
# Mount explicitly specifying the filesystem type
sudo mount -t ext4 /dev/sdb1 /mnt/mydata
sudo mount -t xfs /dev/sdc1 /mnt/storage
sudo mount -t ntfs /dev/sdd1 /mnt/windows

# Mount a FAT32 USB drive
sudo mount -t vfat /dev/sde1 /mnt/usb
```

### Mount Options

```bash
# Mount read-only
sudo mount -o ro /dev/sdb1 /mnt/mydata

# Mount with specific options
sudo mount -o rw,noexec,nosuid /dev/sdb1 /mnt/mydata

# Common options:
# ro          - read-only
# rw          - read-write (default)
# noexec      - prevent execution of binaries
# nosuid      - ignore SUID/SGID bits (security)
# nodev       - ignore device files
# sync        - synchronous writes (safer, slower)
# async       - asynchronous writes (faster, default)
# relatime    - update atime only if mtime/ctime changed (performance)
# noatime     - never update access time (fastest)
# user        - allow non-root users to mount
# auto        - mount with mount -a (at boot)
# noauto      - do not mount with mount -a
```

### Mounting by UUID

Using UUID instead of device name is more reliable because device names (sda, sdb) can change between boots:

```bash
# Get the UUID
sudo blkid /dev/sdb1

# Mount by UUID
sudo mount UUID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" /mnt/mydata

# Or equivalently
sudo mount -U a1b2c3d4-e5f6-7890-abcd-ef1234567890 /mnt/mydata
```

### Mounting by Label

```bash
# Set a label (use e2label for ext4, or during mkfs)
sudo e2label /dev/sdb1 "MyData"

# Mount by label
sudo mount LABEL=MyData /mnt/mydata
```

### Unmounting

```bash
# Unmount by mount point
sudo umount /mnt/mydata

# Unmount by device
sudo umount /dev/sdb1

# Force unmount (if device is busy)
sudo umount -f /mnt/mydata

# Lazy unmount (detach when no longer busy)
sudo umount -l /mnt/mydata

# Find what is using a mount point before unmounting
fuser -m /mnt/mydata
lsof /mnt/mydata
```

## Persistent Mounts with /etc/fstab

Manual mounts disappear on reboot. Add entries to `/etc/fstab` for persistent mounts.

```bash
# Always back up fstab before editing
sudo cp /etc/fstab /etc/fstab.bak

# Edit fstab
sudo nano /etc/fstab
```

The format is:
```text
# device/UUID   mountpoint   fstype   options   dump   pass
UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890  /data  ext4  defaults  0  2
```

Field explanations:
- Field 1: device, UUID, or LABEL
- Field 2: mount point
- Field 3: filesystem type
- Field 4: mount options (defaults = rw,suid,dev,exec,auto,nouser,async)
- Field 5: dump (0 = do not backup, 1 = backup)
- Field 6: fsck pass order (0 = skip, 1 = root, 2 = others)

```bash
# Test fstab without rebooting
sudo mount -a

# Verify the new mount appeared
df -h /data
```

A typo in fstab can prevent the system from booting. Always test with `mount -a` and keep the backup.

## Complete Workflow: Adding a New Disk

```bash
# 1. Identify the new disk
lsblk

# 2. Partition it (e.g., with fdisk)
sudo fdisk /dev/sdb

# 3. Create a filesystem
sudo mkfs.ext4 -L "DataDisk" /dev/sdb1

# 4. Get the UUID
sudo blkid /dev/sdb1

# 5. Create mount point
sudo mkdir /data

# 6. Add to fstab (use the UUID from step 4)
echo 'UUID=YOUR-UUID-HERE /data ext4 defaults 0 2' | sudo tee -a /etc/fstab

# 7. Mount and verify
sudo mount -a
df -h /data
lsblk -f
```

Understanding `lsblk`, `blkid`, and `mount` gives you reliable control over disk management without needing a GUI or specialized tools.

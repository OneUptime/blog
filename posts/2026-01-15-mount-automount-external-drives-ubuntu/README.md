# How to Mount and Automount External Drives on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Storage, Mount, Filesystems, System Administration, Tutorial

Description: Learn how to mount external drives manually and configure automatic mounting on boot using fstab and systemd on Ubuntu.

---

Mounting external drives-whether USB, SATA, or network storage-is essential for expanding storage capacity. This guide covers manual mounting, automatic mounting via fstab, and troubleshooting common filesystem issues on Ubuntu.

## Understanding Mount Points

A mount point is a directory where a filesystem becomes accessible. Common mount points:
- `/mnt` - Temporary mounts
- `/media` - Removable media (auto-mounted by desktop)
- Custom directories like `/data`, `/backup`

## Identifying Drives

### List All Block Devices

```bash
# Show all block devices with details
lsblk

# Show with filesystem information
lsblk -f

# Detailed partition information
sudo fdisk -l
```

### Find Device UUIDs

UUIDs are stable identifiers (device names like sdb1 can change):

```bash
# List UUIDs of all partitions
sudo blkid

# Get UUID of specific device
sudo blkid /dev/sdb1
```

### Identify New USB Drive

```bash
# Watch for new devices in real-time
sudo dmesg -w

# Plug in the drive, then check output for device name
```

## Manual Mounting

### Basic Mount Command

```bash
# Create mount point directory
sudo mkdir -p /mnt/external

# Mount the drive
sudo mount /dev/sdb1 /mnt/external

# Verify mount
df -h /mnt/external
ls /mnt/external
```

### Mount with Specific Options

```bash
# Mount read-only
sudo mount -o ro /dev/sdb1 /mnt/external

# Mount with specific filesystem type
sudo mount -t ext4 /dev/sdb1 /mnt/external

# Mount NTFS drive (Windows)
sudo mount -t ntfs-3g /dev/sdb1 /mnt/windows

# Mount with user read/write permissions
sudo mount -o uid=1000,gid=1000 /dev/sdb1 /mnt/external
```

### Unmounting

```bash
# Unmount drive
sudo umount /mnt/external

# Force unmount if busy
sudo umount -f /mnt/external

# Lazy unmount (detach immediately, cleanup when not busy)
sudo umount -l /mnt/external

# Find what's using the mount point
sudo lsof +D /mnt/external
```

## Automatic Mounting with fstab

The `/etc/fstab` file configures filesystems to mount at boot.

### fstab Format

```
<device>  <mount_point>  <type>  <options>  <dump>  <pass>
```

Fields:
- **device**: UUID, LABEL, or device path
- **mount_point**: Where to mount
- **type**: Filesystem type (ext4, xfs, ntfs, etc.)
- **options**: Mount options
- **dump**: Backup flag (usually 0)
- **pass**: fsck order (0=skip, 1=root, 2=others)

### Backup fstab First

```bash
# Always backup before editing
sudo cp /etc/fstab /etc/fstab.backup
```

### Add Entry for Ext4 Drive

```bash
# Get UUID
sudo blkid /dev/sdb1

# Edit fstab
sudo nano /etc/fstab
```

Add:

```
# External data drive
UUID=abc12345-6789-def0-1234-567890abcdef  /mnt/data  ext4  defaults  0  2
```

### Add Entry for NTFS Drive

```bash
# Install NTFS support
sudo apt install ntfs-3g -y
```

Add to fstab:

```
# Windows NTFS drive
UUID=1234ABCD5678EF90  /mnt/windows  ntfs-3g  defaults,uid=1000,gid=1000,umask=022  0  0
```

### Add Entry for exFAT Drive

```bash
# Install exFAT support
sudo apt install exfat-fuse exfatprogs -y
```

Add to fstab:

```
# USB exFAT drive
UUID=1234-ABCD  /mnt/usb  exfat  defaults,uid=1000,gid=1000,umask=022  0  0
```

### Test fstab Configuration

```bash
# Test mounting all fstab entries without reboot
sudo mount -a

# Check for errors
echo $?  # Should output 0

# Verify mounts
df -h
```

### Common Mount Options

| Option | Description |
|--------|-------------|
| `defaults` | rw, suid, dev, exec, auto, nouser, async |
| `noatime` | Don't update access time (improves performance) |
| `nodiratime` | Don't update directory access time |
| `nofail` | Don't halt boot if mount fails |
| `ro` | Read-only |
| `rw` | Read-write |
| `user` | Allow regular users to mount |
| `uid=1000` | Set owner user ID |
| `gid=1000` | Set owner group ID |
| `umask=022` | Set permission mask |

### Recommended Options for External Drives

```
# For data drives that should never block boot
UUID=...  /mnt/data  ext4  defaults,nofail,noatime  0  2

# For removable drives
UUID=...  /mnt/usb  ext4  defaults,nofail,noauto,user  0  0
```

## Systemd Mount Units

For more control, use systemd mount units.

### Create Mount Unit

```bash
# Unit file name must match mount point path
# /mnt/data becomes mnt-data.mount
sudo nano /etc/systemd/system/mnt-data.mount
```

```ini
[Unit]
Description=External Data Drive
After=local-fs.target

[Mount]
What=/dev/disk/by-uuid/abc12345-6789-def0-1234-567890abcdef
Where=/mnt/data
Type=ext4
Options=defaults,noatime

[Install]
WantedBy=multi-user.target
```

### Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-mount on boot
sudo systemctl enable mnt-data.mount

# Mount now
sudo systemctl start mnt-data.mount

# Check status
sudo systemctl status mnt-data.mount
```

### Automount on Access

Mount only when accessed (useful for rarely-used drives):

```bash
# Create automount unit
sudo nano /etc/systemd/system/mnt-data.automount
```

```ini
[Unit]
Description=Automount External Data Drive

[Automount]
Where=/mnt/data
TimeoutIdleSec=300

[Install]
WantedBy=multi-user.target
```

```bash
# Enable automount (not the mount unit)
sudo systemctl enable mnt-data.automount
sudo systemctl start mnt-data.automount
```

## Working with Network Drives

### Mount NFS Share

```bash
# Install NFS client
sudo apt install nfs-common -y

# Create mount point
sudo mkdir -p /mnt/nfs

# Manual mount
sudo mount -t nfs server:/share /mnt/nfs
```

fstab entry:

```
server:/share  /mnt/nfs  nfs  defaults,_netdev  0  0
```

### Mount CIFS/SMB Share

```bash
# Install CIFS utilities
sudo apt install cifs-utils -y

# Create credentials file
sudo nano /etc/samba/credentials
```

```
username=myuser
password=mypassword
domain=WORKGROUP
```

```bash
# Secure credentials file
sudo chmod 600 /etc/samba/credentials
```

fstab entry:

```
//server/share  /mnt/smb  cifs  credentials=/etc/samba/credentials,_netdev,uid=1000,gid=1000  0  0
```

## Formatting Drives

### Format as Ext4

```bash
# Identify the drive (BE CAREFUL - wrong device = data loss)
lsblk

# Format (this destroys all data!)
sudo mkfs.ext4 -L "DataDrive" /dev/sdb1

# Verify
sudo blkid /dev/sdb1
```

### Format as XFS

```bash
# Install XFS tools
sudo apt install xfsprogs -y

# Format
sudo mkfs.xfs -L "XFSDrive" /dev/sdb1
```

### Create New Partition Table

```bash
# Use gdisk for GPT partition table
sudo apt install gdisk -y
sudo gdisk /dev/sdb

# Commands:
# o - create new GPT
# n - new partition
# w - write changes
```

## Checking and Repairing Filesystems

### Check Ext4 Filesystem

```bash
# Unmount first
sudo umount /dev/sdb1

# Check and repair
sudo fsck.ext4 -f /dev/sdb1

# Check without repairing
sudo fsck.ext4 -n /dev/sdb1
```

### Check XFS Filesystem

```bash
# XFS can be checked while mounted (read-only check)
sudo xfs_repair -n /dev/sdb1

# Repair (must be unmounted)
sudo umount /dev/sdb1
sudo xfs_repair /dev/sdb1
```

### Check NTFS

```bash
# Requires unmounted drive
sudo ntfsfix /dev/sdb1
```

## Monitoring Mount Health

```bash
# View mount information
mount | column -t

# Disk space usage
df -h

# Inode usage
df -i

# IO statistics
iostat -x 1

# Monitor disk activity
sudo iotop
```

## Troubleshooting

### "Mount point does not exist"

```bash
# Create the directory
sudo mkdir -p /mnt/external
```

### "Wrong fs type" Error

```bash
# Check filesystem type
sudo blkid /dev/sdb1

# Install missing filesystem support
sudo apt install ntfs-3g    # For NTFS
sudo apt install exfat-fuse exfatprogs  # For exFAT
```

### "Device is busy"

```bash
# Find processes using the mount
sudo lsof +D /mnt/external

# Kill processes or change directory
cd /

# Force unmount
sudo umount -l /mnt/external
```

### System Won't Boot After fstab Change

Boot into recovery mode and fix fstab:

```bash
# At GRUB, select "Advanced options" → "Recovery mode"

# Or boot from live USB and mount root partition
sudo mount /dev/sda1 /mnt

# Edit fstab
sudo nano /mnt/etc/fstab

# Fix or comment out problematic line
# Add nofail option to prevent boot hang
```

### Permission Denied on Mounted Drive

```bash
# Check mount options
mount | grep /mnt/external

# Remount with correct permissions
sudo mount -o remount,uid=1000,gid=1000 /mnt/external

# For ext4, change ownership instead
sudo chown -R $USER:$USER /mnt/external
```

---

Properly configured mount points ensure your storage is accessible reliably. Use UUIDs in fstab for stability, add `nofail` for external drives, and always test configuration with `mount -a` before rebooting. For critical servers, consider using systemd mount units for better dependency management and status monitoring.

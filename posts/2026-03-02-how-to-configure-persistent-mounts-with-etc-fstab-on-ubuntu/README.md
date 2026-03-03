# How to Configure Persistent Mounts with /etc/fstab on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Disk Management, Storage, System Administration, Linux

Description: Configure /etc/fstab on Ubuntu to set up persistent filesystem mounts that survive reboots, including mount options, UUID usage, network filesystems, and common troubleshooting.

---

`/etc/fstab` is the configuration file that tells Ubuntu which filesystems to mount automatically at boot, along with where to mount them and what options to use. Every time a new disk is added to a server or a network share needs to be available consistently, an entry in fstab is the standard way to make that happen.

## The fstab Format

Each line in `/etc/fstab` has six space-separated fields:

```text
<device>  <mount point>  <filesystem type>  <options>  <dump>  <fsck order>
```

Example:

```text
UUID=abc12345-def6-7890-abcd-ef1234567890  /data  ext4  defaults,noatime  0  2
```

### Field breakdown

**Field 1: Device**

Can be specified as:
- `UUID=...` (strongly preferred - survives device reordering)
- `LABEL=...` (requires setting a label during format)
- `/dev/sdb1` (avoid - can change between reboots)
- `//server/share` (for network filesystems)

**Field 2: Mount point**

The directory where the filesystem will appear. Must exist before mounting.

**Field 3: Filesystem type**

Common values: `ext4`, `xfs`, `btrfs`, `vfat`, `ntfs`, `nfs`, `cifs`, `tmpfs`, `swap`

**Field 4: Options**

Comma-separated list of mount options. `defaults` is equivalent to `rw,suid,dev,exec,auto,nouser,async`.

**Field 5: Dump**

`0` = filesystem not backed up by `dump` utility (almost always `0`)
`1` = filesystem backed up

**Field 6: fsck order**

`0` = do not check at boot
`1` = check first (use for root filesystem `/`)
`2` = check after root (use for other local filesystems)

Network and special filesystems should always have `0` here.

## Viewing Current fstab

```bash
cat /etc/fstab

# Or with line numbers
cat -n /etc/fstab
```

Typical fstab on a fresh Ubuntu install:

```text
# /etc/fstab: static file system information.
#
# Use 'blkid' to print the universally unique identifier for a device.

UUID=9a8b7c6d-5e4f-3210-abcd-ef1234567890 /               ext4    errors=remount-ro 0       1
UUID=ABC1-DEF2                            /boot/efi       vfat    umask=0077      0       1
/swapfile                                 none            swap    sw              0       0
```

## Getting the UUID for a Device

```bash
# Show UUIDs for all block devices
sudo blkid

# Show UUID for a specific device
sudo blkid /dev/sdb1

# Show only the UUID value (for scripting)
sudo blkid -s UUID -o value /dev/sdb1

# Use lsblk to show UUID alongside other info
lsblk -o NAME,UUID,MOUNTPOINT,FSTYPE
```

## Common fstab Entries

### Local ext4 data disk

```text
# Data disk mounted at /data
UUID=abc12345-def6-7890-abcd-ef1234567890  /data  ext4  defaults,noatime  0  2
```

### XFS disk with performance options

```text
# High-performance XFS data partition
UUID=abc12345-def6-7890-abcd-ef1234567890  /data  xfs  defaults,noatime,largeio  0  2
```

### Btrfs with subvolume

```text
# Btrfs filesystem with subvolume
UUID=abc12345-def6-7890-abcd-ef1234567890  /  btrfs  subvol=@,defaults,noatime  0  1
```

### Swap partition

```text
# Swap partition (use device path or UUID)
UUID=swap-uuid-here  none  swap  sw  0  0
```

### tmpfs (RAM-based temporary filesystem)

```text
# Temporary storage in RAM (size option limits usage)
tmpfs  /tmp  tmpfs  defaults,noatime,nosuid,nodev,size=2G  0  0
```

### NFS share

```text
# NFS mount - note: _netdev option ensures network is up before mounting
192.168.1.100:/exports/data  /mnt/nfs  nfs  defaults,_netdev,rw  0  0
```

### Samba/CIFS share

```text
# Windows/Samba share
//fileserver/share  /mnt/samba  cifs  credentials=/etc/samba/creds,uid=1000,gid=1000,_netdev  0  0
```

## Mount Options Reference

### Common options

| Option | Effect |
|--------|--------|
| `defaults` | Standard options (rw, suid, dev, exec, auto, async) |
| `noatime` | Don't update access time on reads (performance) |
| `relatime` | Update atime only if older than mtime (Ubuntu default) |
| `noexec` | Prevent executing programs from this filesystem |
| `nosuid` | Ignore SUID/SGID bits |
| `nodev` | Don't interpret character/block devices |
| `ro` | Mount read-only |
| `rw` | Mount read-write (default) |
| `user` | Allow any user to mount this filesystem |
| `_netdev` | Mark as network device, wait for network at boot |
| `nofail` | Don't report errors if device doesn't exist at boot |

### Combining options for security

For partitions that don't need executable files or special device files:

```text
# Secure /tmp - no execution, no device files, no SUID
tmpfs  /tmp  tmpfs  defaults,noatime,nosuid,nodev,noexec,size=2G  0  0

# Web content - no execution needed from this partition
UUID=abc12345  /var/www  ext4  defaults,noatime,nosuid,nodev,noexec  0  2
```

## Adding a New Entry Safely

The workflow for adding a new fstab entry:

```bash
# 1. Create the mount point directory
sudo mkdir -p /data

# 2. Get the UUID of the device to mount
sudo blkid /dev/sdb1
# /dev/sdb1: UUID="abc12345-def6-7890-abcd-ef1234567890" TYPE="ext4"

# 3. Edit fstab
sudo nano /etc/fstab

# Add the line:
# UUID=abc12345-def6-7890-abcd-ef1234567890  /data  ext4  defaults,noatime  0  2

# 4. Test the entry WITHOUT rebooting (critical step)
sudo mount -a

# 5. Verify it mounted correctly
df -hT /data
ls /data
```

The `mount -a` command mounts everything in fstab that isn't already mounted. If there's an error in your new entry, it will fail here instead of at boot time where it could cause problems.

## The nofail Option

For non-critical mounts (external drives, NAS shares), add `nofail` so a missing device doesn't prevent the system from booting:

```text
# USB drive - won't prevent boot if not present
UUID=abc12345-def6-7890-abcd-ef1234567890  /mnt/backup  ext4  defaults,noatime,nofail  0  2
```

Without `nofail`, a missing device causes the boot process to drop into emergency mode.

## Systemd Mount Units as an Alternative

For complex mount requirements, systemd mount units offer more control than fstab:

```bash
# Create a mount unit for /data
sudo nano /etc/systemd/system/data.mount
```

```ini
[Unit]
Description=Data disk mount
After=local-fs.target

[Mount]
What=/dev/disk/by-uuid/abc12345-def6-7890-abcd-ef1234567890
Where=/data
Type=ext4
Options=defaults,noatime

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable data.mount
sudo systemctl start data.mount
```

Systemd mount units support ordering, dependencies, and timeout conditions that fstab can't express.

## Troubleshooting fstab Issues

### Bad fstab entry causing boot failure

If a bad fstab entry causes the system to drop into emergency mode at boot:

```bash
# At emergency shell, the filesystem is read-only
# Remount root read-write
mount -o remount,rw /

# Edit fstab to fix the bad entry
nano /etc/fstab

# Then reboot
systemctl reboot
```

### Checking fstab syntax before reboot

```bash
# findmnt can verify fstab syntax
findmnt --verify

# Test mount all entries
sudo mount -a --fake  # dry run (shows what would be mounted)
```

### Finding what's mounted from fstab

```bash
# Show all current mounts with their sources
findmnt

# Show only mounts that came from fstab
findmnt --fstab
```

A well-maintained fstab is fundamental to predictable storage configuration. Using UUIDs, testing with `mount -a` before rebooting, and including `nofail` for non-critical mounts are the habits that prevent storage-related boot failures.

# How to Unlock and Mount LUKS Encrypted Drives on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LUKS, Encryption, Storage, Security

Description: Learn how to unlock and mount LUKS encrypted drives on Ubuntu using cryptsetup, covering both manual unlocking and persistent mount configurations.

---

LUKS (Linux Unified Key Setup) is the standard disk encryption specification for Linux. When you have an encrypted drive - whether it's a secondary data disk, an external USB drive, or a backup volume - you need to unlock it before you can access the data. This guide covers the full process of identifying, unlocking, and mounting LUKS encrypted drives on Ubuntu systems.

## Understanding LUKS Encryption

LUKS encrypts block devices at the partition or disk level. When a drive is LUKS encrypted, it presents an encrypted header followed by encrypted data. Before the filesystem on that device is accessible, the encryption layer must be opened using a passphrase or a keyfile.

The tool you'll use for most LUKS operations is `cryptsetup`, which should already be installed on any Ubuntu system that supports encryption. If it's missing:

```bash
sudo apt update && sudo apt install cryptsetup
```

## Identifying LUKS Encrypted Devices

Before you unlock anything, you need to know which device to target.

### List all block devices

```bash
lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINT
```

A LUKS device shows `crypto_LUKS` in the FSTYPE column:

```text
NAME   SIZE FSTYPE      LABEL   MOUNTPOINT
sda    500G
├─sda1 100G ext4        system  /
└─sda2 400G ext4        data    /data
sdb    1T   crypto_LUKS
```

### Verify a device is LUKS encrypted

```bash
sudo cryptsetup isLuks /dev/sdb && echo "LUKS device" || echo "Not LUKS"
```

### View LUKS header information

```bash
sudo cryptsetup luksDump /dev/sdb
```

This shows the LUKS version, cipher, key slots, and UUID - useful for troubleshooting.

## Unlocking a LUKS Encrypted Drive

### Unlock with a passphrase

The `cryptsetup open` command unlocks the device and maps it to a name under `/dev/mapper/`:

```bash
# Syntax: cryptsetup open <device> <mapper-name>
sudo cryptsetup open /dev/sdb encrypted_data
```

You'll be prompted for the passphrase. After entering it correctly, a new device appears at `/dev/mapper/encrypted_data`.

### Unlock with a keyfile

If the LUKS volume uses a keyfile instead of (or in addition to) a passphrase:

```bash
sudo cryptsetup open /dev/sdb encrypted_data --key-file /path/to/keyfile
```

### Verify the device was opened

```bash
ls -la /dev/mapper/
# or
cryptsetup status encrypted_data
```

The `status` command shows cipher, keysize, device backing the mapping, and current open status.

## Mounting the Unlocked Volume

Once opened, the mapped device behaves like any regular block device. You need to mount its filesystem.

### Check the filesystem type

```bash
sudo blkid /dev/mapper/encrypted_data
```

Output example:
```text
/dev/mapper/encrypted_data: UUID="a1b2c3d4-..." TYPE="ext4"
```

### Create a mount point

```bash
sudo mkdir -p /mnt/encrypted_data
```

### Mount the filesystem

```bash
# For ext4
sudo mount /dev/mapper/encrypted_data /mnt/encrypted_data

# For XFS
sudo mount -t xfs /dev/mapper/encrypted_data /mnt/encrypted_data
```

### Verify the mount

```bash
df -h /mnt/encrypted_data
ls /mnt/encrypted_data
```

## Working with the Mounted Volume

Once mounted, you work with the data normally. Standard permissions apply based on the filesystem's ownership settings.

### Fix ownership if needed

If you're accessing data from another system or user account, the UIDs may not match:

```bash
# Check current ownership
ls -la /mnt/encrypted_data

# Change ownership to your current user
sudo chown -R $USER:$USER /mnt/encrypted_data
```

### Check disk usage

```bash
du -sh /mnt/encrypted_data/*
```

## Properly Unmounting and Closing the Volume

This step is critical. You must unmount the filesystem before closing the LUKS mapping. Skipping this can corrupt data.

### Step 1: Unmount the filesystem

```bash
sudo umount /mnt/encrypted_data
```

If you get a "target is busy" error, find what's using the mount:

```bash
lsof /mnt/encrypted_data
# or
fuser -m /mnt/encrypted_data
```

Close any open files or terminals in that path, then retry.

### Step 2: Close the LUKS mapping

```bash
sudo cryptsetup close encrypted_data
```

Verify closure:

```bash
ls /dev/mapper/
# encrypted_data should no longer appear
```

## Handling Multiple Key Slots

LUKS supports up to 8 key slots (LUKS1) or 32 key slots (LUKS2), allowing multiple passphrases or keyfiles for the same volume. This is useful for team environments where multiple people need access.

### List active key slots

```bash
sudo cryptsetup luksDump /dev/sdb | grep -A1 "Key Slot"
```

### Add a new passphrase

```bash
sudo cryptsetup luksAddKey /dev/sdb
```

You'll first enter an existing passphrase to authenticate, then set the new one.

### Remove a passphrase

```bash
# Remove slot by slot number
sudo cryptsetup luksKillSlot /dev/sdb 1
```

Be careful - if you remove all working key slots, you permanently lose access to the data.

## Troubleshooting Common Issues

### "No key available with this passphrase"

Double check you're targeting the right device. Also verify the passphrase - LUKS passphrases are case-sensitive and whitespace-sensitive.

### Device busy on close

You may have processes still accessing files under the mount point. Use `lsof` or `fuser` to identify them:

```bash
sudo fuser -km /mnt/encrypted_data  # Force kill processes (use cautiously)
```

### LUKS header damaged

If `cryptsetup luksDump` fails, the header may be corrupted. This is why backing up the LUKS header is recommended:

```bash
# Backup header
sudo cryptsetup luksHeaderBackup /dev/sdb --header-backup-file /safe/location/sdb_luks_header.img

# Restore header
sudo cryptsetup luksHeaderRestore /dev/sdb --header-backup-file /safe/location/sdb_luks_header.img
```

### Wrong device mapper name conflict

If you try to open a LUKS device with a name already in use:

```bash
# Check what's using that name
cryptsetup status encrypted_data
# Close it first if it's a stale mapping
sudo cryptsetup close encrypted_data
```

## Persistent Mounts vs Manual Unlock

For drives you want mounted automatically at boot, see the companion guide on configuring automatic LUKS unlock. For drives you only access occasionally - external drives, backup volumes, portable drives - manual unlocking as described here is the right approach. It keeps the data locked when not in use and requires explicit action to access.

The workflow is simple: `cryptsetup open`, `mount`, use the data, `umount`, `cryptsetup close`. Getting comfortable with this sequence is the foundation for working with LUKS encryption on Ubuntu.

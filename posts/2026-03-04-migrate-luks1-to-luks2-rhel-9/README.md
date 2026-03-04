# How to Migrate from LUKS1 to LUKS2 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LUKS1, LUKS2, Migration, Encryption, Linux

Description: Migrate existing LUKS1 encrypted volumes to LUKS2 format on RHEL to take advantage of improved features, better key derivation, and enhanced metadata handling.

---

LUKS2 is the default encryption format on RHEL, offering several improvements over LUKS1 including better key derivation with Argon2id, support for authenticated encryption, resilient metadata storage, and more flexible token management. If you have systems that were originally set up with LUKS1, you can convert them in place. This guide covers the migration process.

## LUKS1 vs LUKS2 Comparison

| Feature | LUKS1 | LUKS2 |
|---------|-------|-------|
| Key derivation | PBKDF2 | Argon2id (memory-hard) |
| Key slots | 8 | 32 |
| Metadata redundancy | Single copy | Redundant copies |
| Authenticated encryption | No | Yes (with integrity) |
| Token support | No | Yes (for automated unlock) |
| On-disk format | Binary | JSON-based |
| Online reencryption | No | Yes |

## Prerequisites

Before starting the migration:

```bash
# Check the current LUKS version
sudo cryptsetup luksDump /dev/sdb | head -5

# If it shows "Version: 1", it is LUKS1
# If it shows "Version: 2", it is already LUKS2

# Back up the LUKS header (critical step)
sudo cryptsetup luksHeaderBackup /dev/sdb \
    --header-backup-file /root/luks1-header-backup-sdb.img
```

## Checking Compatibility

Not all LUKS1 configurations can be directly converted:

```bash
# Check for potential issues
sudo cryptsetup luksDump /dev/sdb

# The conversion may fail if:
# - The device uses a non-standard key slot area size
# - The PBKDF parameters are incompatible
# - The device is currently in use by the kernel
```

## Step-by-Step Migration

### Step 1: Unmount and Close the Device

The device must not be in use during conversion:

```bash
# Unmount any filesystems on the encrypted device
sudo umount /mnt/encrypted-data

# If using LVM on LUKS, deactivate the volume group first
sudo vgchange -an encrypted_vg

# Close the LUKS device
sudo cryptsetup luksClose data_encrypted
```

### Step 2: Back Up the Header

This is so important it bears repeating:

```bash
# Create a header backup
sudo cryptsetup luksHeaderBackup /dev/sdb \
    --header-backup-file /root/luks1-header-backup.img

# Verify the backup
sudo cryptsetup luksDump /root/luks1-header-backup.img | head -5
```

### Step 3: Convert to LUKS2

```bash
# Perform the conversion
sudo cryptsetup convert /dev/sdb --type luks2

# You will be prompted to confirm
```

The conversion modifies only the header metadata. It does not re-encrypt the data, so it is fast regardless of device size.

### Step 4: Verify the Conversion

```bash
# Check the new LUKS version
sudo cryptsetup luksDump /dev/sdb | head -5
# Should show: Version: 2

# Verify all key slots are intact
sudo cryptsetup luksDump /dev/sdb | grep -A2 "Keyslots:"

# Test that the passphrase still works
sudo cryptsetup luksOpen --test-passphrase /dev/sdb
```

### Step 5: Open and Mount

```bash
# Open the converted device
sudo cryptsetup luksOpen /dev/sdb data_encrypted

# If using LVM, activate the volume group
sudo vgchange -ay encrypted_vg

# Mount the filesystem
sudo mount /dev/mapper/data_encrypted /mnt/encrypted-data
# Or for LVM:
# sudo mount /dev/encrypted_vg/data /mnt/data

# Verify data integrity
ls -la /mnt/encrypted-data
```

### Step 6: Back Up the New LUKS2 Header

```bash
# Create a backup of the new LUKS2 header
sudo cryptsetup luksHeaderBackup /dev/sdb \
    --header-backup-file /root/luks2-header-backup-sdb.img
```

## Upgrading the Key Derivation Function

After converting to LUKS2, you can upgrade from PBKDF2 to Argon2id for stronger passphrase protection:

```bash
# Convert a key slot to use Argon2id
sudo cryptsetup luksConvertKey --pbkdf argon2id /dev/sdb

# Enter the passphrase for the key slot to convert

# Verify the change
sudo cryptsetup luksDump /dev/sdb | grep -A5 "Keyslots:"
# Should show PBKDF: argon2id
```

You can also specify Argon2id parameters:

```bash
# Set specific Argon2id parameters
sudo cryptsetup luksConvertKey \
    --pbkdf argon2id \
    --pbkdf-memory 1048576 \
    --pbkdf-parallel 4 \
    --iter-time 2000 \
    /dev/sdb
```

## Migrating the Root Device

Migrating the root device requires extra care since the system boots from it:

```bash
# Step 1: Boot from a rescue/live image

# Step 2: Identify the root LUKS device
lsblk -f

# Step 3: Close the device if it was auto-opened
cryptsetup luksClose luks-ROOT_UUID

# Step 4: Back up the header
cryptsetup luksHeaderBackup /dev/sda3 \
    --header-backup-file /tmp/root-luks1-header.img

# Step 5: Convert to LUKS2
cryptsetup convert /dev/sda3 --type luks2

# Step 6: Update initramfs after rebooting
# Boot normally, then:
sudo dracut --force

# Step 7: Verify the system boots correctly
sudo reboot
```

## Rolling Back (Converting LUKS2 Back to LUKS1)

If you need to revert:

```bash
# Convert back to LUKS1
sudo cryptsetup convert /dev/sdb --type luks1

# Note: This only works if you have not used LUKS2-only features
# like more than 8 key slots or Argon2id PBKDF
```

Or restore from the LUKS1 header backup:

```bash
# Restore the original LUKS1 header
sudo cryptsetup luksHeaderRestore /dev/sdb \
    --header-backup-file /root/luks1-header-backup.img
```

## Troubleshooting

### Conversion Fails with "Device is active"

```bash
# Make sure the device is completely closed
sudo dmsetup ls --target crypt
sudo cryptsetup luksClose device_name
```

### Conversion Fails with Incompatible Key Slot

```bash
# Check the error details
sudo cryptsetup convert /dev/sdb --type luks2 --debug

# You may need to remove and re-add a key slot with compatible parameters
```

### Boot Fails After Root Device Conversion

If the system does not boot after converting the root device:

1. Boot from a rescue image
2. Restore the LUKS1 header from backup
3. Investigate and fix the initramfs configuration before retrying

## Summary

Migrating from LUKS1 to LUKS2 on RHEL is a straightforward in-place conversion that only modifies the header. Always back up the header before converting, verify the conversion worked, and consider upgrading the key derivation function to Argon2id for improved passphrase security. The conversion is fast and preserves all existing data and passphrases.

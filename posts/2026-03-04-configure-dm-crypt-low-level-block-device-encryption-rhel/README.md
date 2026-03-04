# How to Configure dm-crypt for Low-Level Block Device Encryption on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, dm-crypt, LUKS, Encryption, Security, Linux

Description: Learn how to use dm-crypt and cryptsetup to encrypt block devices at the low level on RHEL, providing full-disk encryption for sensitive data at rest.

---

Block device encryption with dm-crypt protects data at the storage layer. Even if someone physically removes a disk, the data remains unreadable without the correct passphrase or key. RHEL uses dm-crypt as the kernel-level encryption subsystem, and `cryptsetup` as the userspace tool to manage it.

## Prerequisites

Make sure cryptsetup is installed:

```bash
# Install cryptsetup if not already present
sudo dnf install -y cryptsetup
```

## Encrypting a Block Device with LUKS

LUKS (Linux Unified Key Setup) is the standard format for dm-crypt encryption on Linux. Here is how to encrypt a spare block device (e.g., /dev/sdb):

```bash
# Format the device with LUKS encryption
# This will prompt for a passphrase - choose a strong one
sudo cryptsetup luksFormat /dev/sdb

# Open (unlock) the encrypted device and map it to a name
sudo cryptsetup luksOpen /dev/sdb encrypted_data

# The decrypted device is now available at /dev/mapper/encrypted_data
# Create a filesystem on the mapped device
sudo mkfs.xfs /dev/mapper/encrypted_data

# Mount the filesystem
sudo mkdir -p /mnt/secure
sudo mount /dev/mapper/encrypted_data /mnt/secure
```

## Managing LUKS Keys

You can add multiple key slots (up to 8 total) for the same device:

```bash
# Add a new passphrase to key slot
sudo cryptsetup luksAddKey /dev/sdb

# Remove a passphrase from a specific key slot
sudo cryptsetup luksRemoveKey /dev/sdb

# Check the status of the LUKS header and key slots
sudo cryptsetup luksDump /dev/sdb
```

## Automounting at Boot with /etc/crypttab

To automatically unlock and mount the encrypted device at boot, add entries to `/etc/crypttab` and `/etc/fstab`:

```bash
# Get the UUID of the LUKS device
sudo cryptsetup luksUUID /dev/sdb

# Add to /etc/crypttab (replace UUID with your actual UUID)
# Format: name  UUID=<uuid>  none  luks
echo "encrypted_data UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx none luks" | sudo tee -a /etc/crypttab

# Add to /etc/fstab for automatic mounting
echo "/dev/mapper/encrypted_data /mnt/secure xfs defaults 0 0" | sudo tee -a /etc/fstab
```

## Closing an Encrypted Volume

```bash
# Unmount and close the encrypted device
sudo umount /mnt/secure
sudo cryptsetup luksClose encrypted_data
```

Using dm-crypt with LUKS is the recommended approach for block-level encryption on RHEL. It integrates well with systemd, Clevis for automated unlocking, and Tang for network-bound disk encryption.

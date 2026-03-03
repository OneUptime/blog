# How to Set Up LUKS with Multiple Key Slots on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, LUKS, Disk Encryption

Description: Learn how to configure LUKS disk encryption with multiple key slots on Ubuntu, enabling different passwords, key files, and recovery mechanisms for encrypted volumes.

---

LUKS (Linux Unified Key Setup) supports up to 32 key slots (LUKS2) or 8 key slots (LUKS1), each capable of holding a different passphrase or key file. This means you can have a regular password for daily use, a separate recovery passphrase stored securely offline, and a key file for automated unlocking - all on the same encrypted volume.

Understanding key slots lets you manage encrypted drives more safely. When an administrator leaves your organization, you revoke their specific slot without disturbing other access methods. When a passphrase may be compromised, you add a new one and remove the old one without re-encrypting the entire volume.

## Prerequisites

Install the cryptsetup tools if not already present:

```bash
sudo apt update
sudo apt install cryptsetup -y
```

Verify the cryptsetup version - LUKS2 requires cryptsetup 2.x:

```bash
cryptsetup --version
```

## Understanding LUKS Key Slots

LUKS uses a master encryption key that actually encrypts the data. Each key slot stores a copy of this master key, encrypted with a different passphrase or key file. When you unlock the volume, LUKS tries each key slot until one decrypts successfully.

This means:
- Every key slot has equal access to the data
- Adding or removing a key slot does not re-encrypt the data
- Revoking a slot only removes that passphrase's access, leaving data intact
- All slots must be removed to destroy access to the data

## Checking Existing Key Slots

To see which slots are in use on an existing LUKS volume:

```bash
# For LUKS1
sudo cryptsetup luksDump /dev/sdb1

# For LUKS2
sudo cryptsetup luksDump /dev/sdb1
```

In the output, look for the `Keyslots:` section (LUKS2) or `Key Slot` entries (LUKS1):

```text
# LUKS2 example output (relevant section):
Keyslots:
  0: luks2
       Key:        512 bits
       Priority:   normal
       Cipher:     aes-xts-plain64
       ...
```

A slot marked as `DISABLED` (LUKS1) or absent from the list (LUKS2) is empty and available.

## Adding a Second Passphrase

If you have a LUKS volume already set up with one passphrase and want to add a second:

```bash
# Add a new passphrase to the next available key slot
sudo cryptsetup luksAddKey /dev/sdb1

# You will be prompted for:
# 1. An existing passphrase (to verify you have access)
# 2. The new passphrase (entered twice)
```

To specify which slot to use:

```bash
# Add passphrase to slot 2 specifically
sudo cryptsetup luksAddKey --key-slot 2 /dev/sdb1
```

Verify the slot was added:

```bash
sudo cryptsetup luksDump /dev/sdb1 | grep -A5 "Keyslots"
```

## Adding a Key File

Key files are useful for automated unlocking without interactive passphrase entry. They can be a random binary file or any file you choose.

### Generating a Random Key File

```bash
# Generate a 4096-byte random key file
sudo dd if=/dev/urandom of=/root/luks-keyfile bs=1 count=4096
sudo chmod 400 /root/luks-keyfile
```

### Adding the Key File to a Key Slot

```bash
# Add the key file to the next available slot
# You will be prompted for an existing passphrase to authorize the addition
sudo cryptsetup luksAddKey /dev/sdb1 /root/luks-keyfile

# Verify
sudo cryptsetup luksDump /dev/sdb1
```

### Testing the Key File

```bash
# Test that the key file can unlock the volume
sudo cryptsetup luksOpen --test-passphrase /dev/sdb1 --key-file /root/luks-keyfile
echo "Exit code: $?"
# Exit code 0 means success
```

### Opening a Volume with a Key File

```bash
# Open (unlock) the volume using the key file
sudo cryptsetup luksOpen /dev/sdb1 my_volume --key-file /root/luks-keyfile

# The decrypted volume appears at /dev/mapper/my_volume
```

## Creating a Recovery Key Slot

A recovery passphrase should be a long, randomly generated string stored offline (printed on paper or in a physical safe):

```bash
# Generate a strong recovery passphrase
openssl rand -base64 48
# Example output: kPq8X2mN9aL7bR3cD5fG1hJ4kM6nP8qR2sT5uV7wX9yA==
# Store this somewhere safe before proceeding
```

Add it to a specific slot (slot 7 is a common choice for recovery keys):

```bash
# Add the recovery passphrase to slot 7
sudo cryptsetup luksAddKey --key-slot 7 /dev/sdb1

# Enter an existing passphrase when prompted, then the recovery passphrase
```

Label the slot for documentation purposes (LUKS2 only):

```bash
# LUKS2 supports token labels to describe key slots
sudo cryptsetup token add --token-id 0 \
  --json-string '{"type": "recovery-key", "description": "Offline recovery passphrase", "slot": 7}' \
  /dev/sdb1
```

## Revoking a Key Slot

When a passphrase is compromised or an employee leaves:

```bash
# Remove a specific key slot by number
# WARNING: This permanently removes access via that slot
sudo cryptsetup luksKillSlot /dev/sdb1 2

# You must provide an existing passphrase from another slot to authorize this
```

After removing a slot, verify it is disabled:

```bash
sudo cryptsetup luksDump /dev/sdb1
```

Slot 2 should no longer appear in the keyslots list.

## Changing a Passphrase

To change a passphrase, add the new one to the same slot after providing the old:

```bash
# Change passphrase in slot 1
sudo cryptsetup luksChangeKey --key-slot 1 /dev/sdb1

# Prompted for:
# 1. Old passphrase
# 2. New passphrase (twice)
```

## Configuring Automatic Unlocking with a Key File on Boot

To automatically unlock a secondary encrypted volume at boot using a key file:

Edit `/etc/crypttab`:

```bash
sudo nano /etc/crypttab
```

Add an entry:

```text
# Format: <name> <device> <key-file> <options>
data_volume  /dev/sdb1  /root/luks-keyfile  luks,key-slot=1
```

Then update `/etc/fstab` to mount the unlocked volume:

```text
/dev/mapper/data_volume  /data  ext4  defaults  0  2
```

Apply the changes:

```bash
sudo update-initramfs -u
```

## Backing Up the LUKS Header

The LUKS header contains all key slot information. If it is corrupted, the data is unrecoverable even with the correct passphrase. Back it up regularly:

```bash
# Create a header backup
sudo cryptsetup luksHeaderBackup /dev/sdb1 \
  --header-backup-file /secure-backup/sdb1-luks-header-$(date +%Y%m%d).img

# Secure the backup file - it can be used to bypass slot revocation
sudo chmod 400 /secure-backup/sdb1-luks-header-*.img
```

Store this backup offline, separate from the data drive. If the header is damaged, restore it:

```bash
# Restore header from backup
sudo cryptsetup luksHeaderRestore /dev/sdb1 \
  --header-backup-file /secure-backup/sdb1-luks-header-20260302.img
```

## Summary

LUKS key slots provide a flexible access management system for encrypted volumes. Each slot holds an independently usable credential - whether a passphrase, key file, or recovery key. Adding and removing slots requires only an existing credential, not re-encryption of the data. This makes it practical to rotate passphrases when personnel change, maintain offline recovery access, and automate unlocking for secondary volumes, all while keeping the underlying encryption intact. Always keep a backup of the LUKS header to protect against header corruption.

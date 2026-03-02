# How to Configure dm-crypt and LUKS for Block Device Encryption on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, LUKS, Encryption, dm-crypt

Description: Learn how to configure dm-crypt and LUKS on Ubuntu to encrypt block devices, external drives, and partitions with full-disk encryption and automatic unlocking.

---

LUKS (Linux Unified Key Setup) is the standard for disk encryption on Linux. It provides a secure, well-designed on-disk format for encrypted block devices using the dm-crypt kernel module. Unlike eCryptfs (which encrypts at the filesystem level), LUKS encrypts the entire block device, protecting all data including filesystem structures, file metadata, and free space.

## How dm-crypt and LUKS Work

- **dm-crypt**: A kernel module that provides transparent disk encryption using the device mapper
- **LUKS**: A specification and on-disk format that adds key management on top of dm-crypt
- **cryptsetup**: The userspace tool that manages LUKS and dm-crypt

The LUKS header stores up to 8 key slots. Each key slot can hold a different passphrase or key file. Any valid key unlocks the master encryption key, which in turn decrypts the device.

## Installing cryptsetup

```bash
# cryptsetup handles LUKS operations
sudo apt update
sudo apt install cryptsetup -y

# Verify installation
cryptsetup --version

# Load the dm-crypt kernel module
sudo modprobe dm-crypt

# Verify it's loaded
lsmod | grep dm_crypt
```

## Creating a LUKS-Encrypted Partition

**Warning**: Creating a LUKS container destroys all existing data on the target device.

### Identifying the Target Device

```bash
# List all block devices
lsblk

# Get detailed partition information
sudo fdisk -l

# For an external USB drive, it's typically /dev/sdb or /dev/sdc
# For NVMe drives: /dev/nvme1n1
# NEVER target your boot drive (usually /dev/sda or /dev/nvme0n1)
```

### Creating the LUKS Container

```bash
# LUKS format the device - THIS DESTROYS ALL DATA ON /dev/sdb
# Use a strong passphrase
sudo cryptsetup luksFormat /dev/sdb

# With explicit cipher and key size specification
sudo cryptsetup luksFormat \
    --type luks2 \
    --cipher aes-xts-plain64 \
    --key-size 512 \
    --hash sha256 \
    --iter-time 2000 \
    /dev/sdb

# Format a specific partition instead of the whole disk
sudo cryptsetup luksFormat /dev/sdb1
```

The parameters explained:
- `--type luks2`: Use LUKS version 2 (default on modern systems, supports Argon2id)
- `--cipher aes-xts-plain64`: AES in XTS mode - standard for disk encryption
- `--key-size 512`: 512-bit key (AES-XTS uses half for each direction: effective 256-bit)
- `--hash sha256`: Hash algorithm for key derivation
- `--iter-time 2000`: Time in ms to spend on passphrase hashing (higher = harder to brute-force)

### Opening the LUKS Container

```bash
# Open (decrypt) the LUKS container
# This creates a /dev/mapper/myencrypteddrive virtual device
sudo cryptsetup open /dev/sdb myencrypteddrive

# Or use luksOpen (equivalent)
sudo cryptsetup luksOpen /dev/sdb myencrypteddrive

# The decrypted device is now available at:
ls /dev/mapper/myencrypteddrive
```

### Creating a Filesystem on the Encrypted Device

```bash
# Create an ext4 filesystem on the decrypted device
sudo mkfs.ext4 /dev/mapper/myencrypteddrive

# Or create XFS (better for large files)
sudo mkfs.xfs /dev/mapper/myencrypteddrive

# Create a mount point and mount the filesystem
sudo mkdir -p /mnt/encrypted-drive
sudo mount /dev/mapper/myencrypteddrive /mnt/encrypted-drive

# Verify it's mounted
df -h /mnt/encrypted-drive
mount | grep mapper
```

## Closing the LUKS Container

```bash
# Unmount the filesystem first
sudo umount /mnt/encrypted-drive

# Close the LUKS container (this re-encrypts and removes the decrypted device)
sudo cryptsetup close myencrypteddrive
# or
sudo cryptsetup luksClose myencrypteddrive

# Verify it's closed
ls /dev/mapper/  # myencrypteddrive should be gone
```

## Automating Mount at Boot with /etc/crypttab

For persistent mounts (e.g., an internal data drive), configure automatic unlocking:

### With a Passphrase (Manual Unlock at Boot)

```bash
# Get the UUID of the LUKS device
sudo blkid /dev/sdb
# Example: UUID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" TYPE="crypto_LUKS"

# Add to /etc/crypttab
# Format: name  device                      keyfile  options
echo "dataencrypted  UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890  none  luks" | \
    sudo tee -a /etc/crypttab

# Add to /etc/fstab for auto-mount after unlocking
echo "/dev/mapper/dataencrypted  /data  ext4  defaults,nofail  0  2" | \
    sudo tee -a /etc/fstab

# Test the crypttab entry
sudo cryptdisks_start dataencrypted
sudo mount /data
```

### With a Key File (Automated Unlock at Boot)

For internal drives that should unlock without user intervention:

```bash
# Generate a random key file
sudo dd if=/dev/urandom of=/root/luks-keyfile bs=4096 count=1
sudo chmod 400 /root/luks-keyfile

# Add the key file as a LUKS key slot
sudo cryptsetup luksAddKey /dev/sdb /root/luks-keyfile

# Update /etc/crypttab to use the key file
echo "dataencrypted  UUID=a1b2c3d4-...  /root/luks-keyfile  luks" | \
    sudo tee -a /etc/crypttab
```

## Managing LUKS Key Slots

LUKS supports up to 8 key slots. Each slot can have a different passphrase or key file:

```bash
# Show LUKS header information (including which key slots are used)
sudo cryptsetup luksDump /dev/sdb

# Add a new passphrase (up to 8 total)
sudo cryptsetup luksAddKey /dev/sdb

# Add a key file as a key slot
sudo cryptsetup luksAddKey /dev/sdb /path/to/keyfile

# Remove a passphrase (need to enter the passphrase to remove)
sudo cryptsetup luksRemoveKey /dev/sdb

# Remove a key slot by number (0-7)
sudo cryptsetup luksKillSlot /dev/sdb 3

# Change a passphrase (removes old, adds new in same slot)
sudo cryptsetup luksChangeKey /dev/sdb
```

## Inspecting LUKS Containers

```bash
# Show detailed LUKS header information
sudo cryptsetup luksDump /dev/sdb

# Show used key slots and encryption parameters:
# Version: 2
# Cipher: aes-xts-plain64
# Key size: 512 bits
# Data segments: 1
# Keyslots: 0: luks2 (active), 1: (inactive), ...

# Check if a device is a LUKS device
sudo cryptsetup isLuks /dev/sdb && echo "LUKS device" || echo "Not LUKS"

# Get the LUKS UUID
sudo cryptsetup luksUUID /dev/sdb

# Show status of an open device
sudo cryptsetup status myencrypteddrive
```

## Backing Up the LUKS Header

The LUKS header contains the encryption metadata. If it's corrupted, data is unrecoverable even with the correct passphrase. Back it up.

```bash
# Backup the LUKS header to a file
sudo cryptsetup luksHeaderBackup /dev/sdb \
    --header-backup-file /secure-backup/luks-header-sdb.backup

# Store this backup in a secure location SEPARATE from the drive

# Restore the LUKS header from backup (if header is corrupted)
sudo cryptsetup luksHeaderRestore /dev/sdb \
    --header-backup-file /secure-backup/luks-header-sdb.backup
```

## Encrypting an Existing Drive Without Data Loss

To encrypt a drive that already has data (without formatting):

```bash
# Option 1: Use cryptsetup-reencrypt (in-place encryption)
# WARNING: This is risky - have a backup before doing this
sudo cryptsetup-reencrypt --encrypt /dev/sdb --reduce-device-size 32M

# This process:
# 1. Reduces the device size by 32MB to make room for the LUKS header
# 2. Encrypts the data in place (can take hours for large drives)
# 3. Can be interrupted and resumed

# Resume an interrupted reencryption
sudo cryptsetup reencrypt --resume-only /dev/sdb
```

## Creating an Encrypted Container File

Instead of encrypting an entire partition, create an encrypted container as a regular file:

```bash
# Create a 1GB container file
dd if=/dev/zero of=/home/user/secure-container.bin bs=1M count=1024

# Format it as LUKS
sudo cryptsetup luksFormat /home/user/secure-container.bin

# Open it
sudo cryptsetup open /home/user/secure-container.bin secure-files

# Create filesystem
sudo mkfs.ext4 /dev/mapper/secure-files

# Mount it
sudo mkdir /mnt/secure
sudo mount /dev/mapper/secure-files /mnt/secure

# When done, unmount and close
sudo umount /mnt/secure
sudo cryptsetup close secure-files
```

## Performance Testing

```bash
# Benchmark available cipher options
sudo cryptsetup benchmark

# Test a specific cipher
sudo cryptsetup benchmark --cipher aes-xts-plain64 --key-size 256

# Compare read/write performance on encrypted vs unencrypted device
# (with AES-NI hardware acceleration, difference is minimal on modern hardware)
sudo hdparm -t /dev/sdb                          # Unencrypted speed
sudo hdparm -t /dev/mapper/myencrypteddrive      # Encrypted speed
```

## Security Considerations

```bash
# Wipe the LUKS header to make data permanently inaccessible
# Without the header, not even your passphrase can recover the data
# USE WITH EXTREME CAUTION - this is irreversible
sudo cryptsetup luksErase /dev/sdb  # Wipes all key slots
# OR - nuclear option: overwrite the header entirely
sudo dd if=/dev/urandom of=/dev/sdb bs=512 count=2056

# Securely wipe free space after deleting files from an encrypted volume
sudo fstrim /mnt/encrypted-drive  # For SSDs (TRIM)
# For HDDs: fill with zeros
sudo dd if=/dev/zero of=/mnt/encrypted-drive/temp-wipe bs=1M && rm /mnt/encrypted-drive/temp-wipe
```

LUKS with dm-crypt is the gold standard for Linux disk encryption. Combined with a strong passphrase, secure key slot management, and LUKS header backups, it provides robust protection for data at rest.

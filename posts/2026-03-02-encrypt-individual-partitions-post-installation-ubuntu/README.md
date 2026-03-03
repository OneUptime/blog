# How to Encrypt Individual Partitions Post-Installation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, LUKS, Partitions

Description: Step-by-step guide to encrypting individual partitions on an existing Ubuntu installation without reinstalling, covering data backup, LUKS setup, and filesystem migration.

---

Enabling full disk encryption during installation is straightforward - the Ubuntu installer handles the LUKS setup automatically. Doing it after the fact is more involved but entirely possible. The general approach is to back up the data, wipe and re-create the partition as a LUKS container, format a filesystem inside it, restore the data, and update the system configuration so everything mounts correctly.

This guide covers encrypting secondary partitions (data drives, home partitions) post-installation. Encrypting the root partition while the system is running requires additional steps involving a live environment, which is also covered.

## Planning Your Encryption

Before starting, decide:

1. **Which partitions to encrypt** - data drives, `/home`, `/var`, secondary storage
2. **LUKS version** - use LUKS2 (the default in current cryptsetup) for better features
3. **Cipher** - `aes-xts-plain64` is the standard choice; key sizes of 256 or 512 bits
4. **Key management** - passphrase, key file, or automated (Tang/TPM)
5. **Backup strategy** - encryption requires wiping the partition; backup is mandatory

## Prerequisites

Install cryptsetup:

```bash
sudo apt update
sudo apt install cryptsetup -y
```

Check existing partitions:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT
fdisk -l
```

## Encrypting a Secondary Data Partition

This is the simplest case - a partition that is not mounted as root, home, or any other critical path.

### Step 1: Backup the Data

```bash
# Example: backup /dev/sdb1 data to an external drive
sudo rsync -av /mnt/data/ /backup/data-backup/

# Or use tar
sudo tar czf /backup/data-backup.tar.gz -C /mnt/data .

# Verify the backup
ls -lh /backup/data-backup.tar.gz
```

Do not skip this step. The next steps will destroy all existing data on the partition.

### Step 2: Unmount and Wipe the Partition

```bash
# Unmount if currently mounted
sudo umount /dev/sdb1

# Optional: securely overwrite the partition before LUKS setup
# This ensures no data remains in unallocated space
# Note: takes time proportional to partition size
sudo dd if=/dev/urandom of=/dev/sdb1 bs=4M status=progress
```

### Step 3: Create the LUKS Container

```bash
# Format the partition as LUKS2
sudo cryptsetup luksFormat --type luks2 \
  --cipher aes-xts-plain64 \
  --key-size 512 \
  --hash sha256 \
  /dev/sdb1
```

When prompted, type `YES` (uppercase) and enter a strong passphrase.

Verify the LUKS header:

```bash
sudo cryptsetup luksDump /dev/sdb1
```

### Step 4: Open the LUKS Container

```bash
sudo cryptsetup luksOpen /dev/sdb1 data_encrypted
```

The decrypted device appears at `/dev/mapper/data_encrypted`.

### Step 5: Create a Filesystem

```bash
# Create ext4 filesystem
sudo mkfs.ext4 -L data /dev/mapper/data_encrypted

# Or XFS for large files and high throughput
sudo mkfs.xfs -L data /dev/mapper/data_encrypted
```

### Step 6: Restore the Data

```bash
# Create a mount point and mount the encrypted partition
sudo mkdir -p /mnt/data-new
sudo mount /dev/mapper/data_encrypted /mnt/data-new

# Restore from rsync backup
sudo rsync -av /backup/data-backup/ /mnt/data-new/

# Verify data integrity
diff -r /backup/data-backup/ /mnt/data-new/
```

### Step 7: Configure Persistent Mounting

Get the UUID of the LUKS partition:

```bash
sudo blkid /dev/sdb1
# Note the UUID field
```

Edit `/etc/crypttab` to auto-open the LUKS container:

```bash
sudo nano /etc/crypttab
```

```text
# Format: <name>  <device-UUID>  <key>  <options>
data_encrypted  UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  none  luks
```

Using `none` as the key means the system will prompt for the passphrase at boot.

Edit `/etc/fstab` to mount the decrypted device:

```bash
sudo nano /etc/fstab
```

```text
# Mount the encrypted data partition
/dev/mapper/data_encrypted  /data  ext4  defaults  0  2
```

Test the configuration without rebooting:

```bash
# Close and reopen the LUKS container
sudo umount /data
sudo cryptsetup luksClose data_encrypted

# Open using crypttab configuration
sudo cryptdisks_start data_encrypted
sudo mount /data

# Verify
df -h /data
ls /data
```

## Encrypting the /home Partition

Encrypting `/home` requires unmounting it while users are logged out. This typically requires booting to a live USB or single-user mode.

### Option A: Using a Live USB Environment

1. Boot from Ubuntu live USB
2. Open a terminal in the live environment
3. Proceed with the backup, LUKS format, and restore steps above on the `/home` partition

From the live environment:

```bash
# Mount the existing home partition (if you need to back up data from it)
sudo mount /dev/sda3 /mnt/home-backup

# Backup home
sudo rsync -av /mnt/home-backup/ /backup/home/
sudo umount /mnt/home-backup

# Encrypt the partition
sudo cryptsetup luksFormat --type luks2 /dev/sda3
sudo cryptsetup luksOpen /dev/sda3 home_encrypted
sudo mkfs.ext4 /dev/mapper/home_encrypted

# Restore data
sudo mount /dev/mapper/home_encrypted /mnt/home-new
sudo rsync -av /backup/home/ /mnt/home-new/
sudo umount /mnt/home-new
sudo cryptsetup luksClose home_encrypted
```

4. Boot back into the installed system
5. Update `/etc/crypttab` and `/etc/fstab` as described above

### Option B: Temporary /home on Another Partition

```bash
# Create a temporary home location
sudo mkdir /tmp/home-temp
sudo rsync -av /home/ /tmp/home-temp/

# Unmount /home if it is on its own partition
sudo umount /home

# Encrypt and recreate
sudo cryptsetup luksFormat --type luks2 /dev/sda3
sudo cryptsetup luksOpen /dev/sda3 home_encrypted
sudo mkfs.ext4 /dev/mapper/home_encrypted
sudo mount /dev/mapper/home_encrypted /home

# Restore
sudo rsync -av /tmp/home-temp/ /home/
```

## Using a Key File for Automated Unlocking

To avoid entering a passphrase for secondary partitions at boot, use a key file stored on the (already encrypted) root filesystem:

```bash
# Create a key file
sudo mkdir -p /etc/luks-keys
sudo dd if=/dev/urandom of=/etc/luks-keys/data.key bs=1 count=4096
sudo chmod 600 /etc/luks-keys/data.key

# Add the key file to the LUKS volume
sudo cryptsetup luksAddKey /dev/sdb1 /etc/luks-keys/data.key
# Enter existing passphrase when prompted

# Update crypttab to use the key file
# Replace 'none' with the key file path
```

In `/etc/crypttab`:

```text
data_encrypted  UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  /etc/luks-keys/data.key  luks
```

## Verifying Encryption is Working

After configuration:

```bash
# Check LUKS status
sudo cryptsetup status data_encrypted

# Verify the mount
mount | grep data_encrypted

# Check no unencrypted access to raw partition
sudo hexdump -C /dev/sdb1 | head -5
# Output should be random-looking ciphertext, not readable data
```

## Summary

Post-installation encryption of individual partitions follows a consistent pattern: back up the data, wipe the partition, create a LUKS container, format a filesystem inside it, restore the data, then update `/etc/crypttab` and `/etc/fstab`. Secondary data partitions can be handled while the system is running. Partitions that are mounted at boot (like `/home`) require working from a live environment or temporarily relocating the data. Using key files on the encrypted root filesystem enables automated unlocking of secondary partitions without storing plaintext keys or prompting for multiple passphrases at boot.

# How to Set Up Full Disk Encryption on an Existing Ubuntu System

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, LUKS, Disk Management

Description: A practical guide to enabling full disk encryption on an already-installed Ubuntu system using LUKS, without doing a fresh install.

---

Full disk encryption protects your data when a machine is lost or stolen. Ubuntu's installer makes it easy to enable encryption during setup, but what if you already have a running system? Adding LUKS encryption to an existing Ubuntu installation requires careful planning and a willingness to back up your data first - there is no in-place encryption path that is completely risk-free, but there are practical approaches depending on your partition layout.

This guide covers the two main strategies: encrypting a secondary data partition in-place, and doing a proper encrypted reinstall while preserving your data.

## Understanding What Full Disk Encryption Actually Covers

"Full disk encryption" typically means the root filesystem, swap space, and the `/home` partition are all encrypted with LUKS (Linux Unified Key Setup). The `/boot` partition - containing the kernel and initramfs - usually stays unencrypted because GRUB needs to read it before the decryption password can be entered.

A true full-disk setup on Ubuntu looks like:

```
/dev/sda1  ->  /boot  (unencrypted, ~512MB)
/dev/sda2  ->  LUKS container
               └── LVM VG
                   ├── root LV  ->  /
                   ├── swap LV  ->  swap
                   └── home LV  ->  /home
```

## Strategy 1: Encrypting the /home Partition

If your `/home` is on a separate partition, you can encrypt it without reinstalling. This is the least risky approach for a running system.

### Back Up First

```bash
# Back up /home to an external drive
sudo rsync -aHAXv /home/ /mnt/backup/home/

# Verify the backup looks correct
ls -la /mnt/backup/home/
```

### Unmount and Encrypt

You cannot encrypt a mounted partition, so boot from a live USB or work from another terminal where `/home` is not in use (log out of your desktop session first).

```bash
# Check what's on the partition before touching it
sudo blkid /dev/sda3

# Unmount /home
sudo umount /home

# DESTRUCTIVE - this wipes all data on /dev/sda3
# Make sure your backup is complete before running this
sudo cryptsetup luksFormat --type luks2 /dev/sda3

# Open the newly-created LUKS container
sudo cryptsetup open /dev/sda3 home_crypt

# Format the mapped device
sudo mkfs.ext4 /dev/mapper/home_crypt

# Mount it and restore data
sudo mount /dev/mapper/home_crypt /home
sudo rsync -aHAXv /mnt/backup/home/ /home/
```

### Configure Automatic Unlocking at Boot

Get the UUID of the LUKS partition:

```bash
sudo blkid /dev/sda3 | grep -o 'UUID="[^"]*"'
```

Add an entry to `/etc/crypttab`:

```bash
# Format: name  device           keyfile  options
# UUID below is just an example - use your actual UUID
home_crypt  UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890  none  luks
```

Update `/etc/fstab` to use the mapped device instead of the raw partition:

```bash
# Replace the old /home line with this
/dev/mapper/home_crypt  /home  ext4  defaults  0  2
```

Update the initramfs so the system can unlock the drive at boot:

```bash
sudo update-initramfs -u -k all
```

## Strategy 2: Fresh Install with Encryption (Recommended for Root)

Encrypting the root partition on a live system is not directly supported - you cannot encrypt the filesystem you are currently running from. The proper approach is to back up everything, reinstall with encryption enabled, and restore your data.

### Preparation

```bash
# Create a full system backup
sudo apt install -y borgbackup

# Initialize a borg repository on an external drive
borg init --encryption=repokey /mnt/external/backup

# Back up the whole system excluding ephemeral paths
sudo borg create --stats --progress \
  /mnt/external/backup::before-encryption-$(date +%Y%m%d) \
  / \
  --exclude /proc \
  --exclude /sys \
  --exclude /dev \
  --exclude /run \
  --exclude /mnt \
  --exclude /tmp \
  --exclude /lost+found
```

### Install Ubuntu with Encryption

Boot the Ubuntu installer, and when you reach the "Installation type" screen, choose "Erase disk and install Ubuntu" and check the "Encrypt the new Ubuntu installation for security" option. Set a strong passphrase.

### Restore Your Data

After the fresh install boots:

```bash
# Mount the backup drive
sudo mount /dev/sdb1 /mnt/external

# Restore /home from backup (adjust the archive name)
sudo borg extract \
  /mnt/external/backup::before-encryption-20260302 \
  home/yourusername

# Move it into place
sudo mv home/yourusername /home/
sudo chown -R yourusername:yourusername /home/yourusername
```

## Managing LUKS Keys

Once encrypted, you can add additional unlock keys - useful for recovery scenarios or scripts that need to unlock without human input.

```bash
# Add a recovery key (you'll be prompted for an existing key first)
sudo cryptsetup luksAddKey /dev/sda3

# See how many key slots are in use
sudo cryptsetup luksDump /dev/sda3 | grep "Key Slot"

# Remove a key slot (be careful - you can lock yourself out)
sudo cryptsetup luksRemoveKey /dev/sda3
```

## Adding a Key File for Automatic Unlocking

If you have multiple encrypted partitions, typing a password for each one at boot gets tedious. A key file stored on the root partition can unlock secondary volumes automatically.

```bash
# Generate a random key file
sudo dd if=/dev/urandom of=/etc/luks-keys/home.key bs=4096 count=1
sudo chmod 400 /etc/luks-keys/home.key

# Add the key file as an authorized key for the partition
sudo cryptsetup luksAddKey /dev/sda3 /etc/luks-keys/home.key

# Update /etc/crypttab to use the key file
# home_crypt  UUID=...  /etc/luks-keys/home.key  luks
```

## Verifying Encryption Is Working

```bash
# Check that the LUKS container is open
sudo cryptsetup status home_crypt

# Confirm the filesystem is on the mapped device, not the raw partition
lsblk -f /dev/sda3

# Look at the LUKS header to verify configuration
sudo cryptsetup luksDump /dev/sda3
```

## Performance Considerations

LUKS encryption adds a small CPU overhead. On modern hardware with AES-NI instruction set support, the impact is negligible. Verify your CPU supports hardware acceleration:

```bash
# Check for AES-NI support
grep -m1 aes /proc/cpuinfo

# Test encryption throughput
sudo cryptsetup benchmark
```

The benchmark output shows speeds for different cipher/key-size combinations. The default `aes-xts-plain64` with 256-bit keys typically achieves several gigabytes per second on modern CPUs, which is faster than most storage devices.

## Important Caveats

Keep the LUKS header backed up. If it gets corrupted, the data is unrecoverable:

```bash
# Back up the LUKS header to a safe location
sudo cryptsetup luksHeaderBackup /dev/sda3 \
  --header-backup-file /mnt/external/sda3-luks-header.img
```

Store this header backup somewhere separate from the encrypted drive itself - an external drive or encrypted cloud storage. Without it, a damaged header means permanent data loss regardless of whether you remember the passphrase.

Full disk encryption protects against physical theft but not against a running compromised system. Pair it with proper access controls, regular updates, and monitoring tools like [OneUptime](https://oneuptime.com) to get a complete security posture.

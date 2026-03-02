# How to Encrypt External USB Drives on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, LUKS, USB

Description: Learn to encrypt external USB drives on Ubuntu using LUKS so your portable storage is protected if lost or stolen, with automatic unlock options.

---

USB drives get lost. They fall out of pockets, get left at conference rooms, forgotten in airport trays. If you carry sensitive data on portable storage, encryption is not optional - it is the minimum reasonable precaution. Ubuntu makes this easy with LUKS, and the encrypted drive will work on any Linux system (and with extra software, on Windows and macOS too).

## Identifying Your USB Drive

Before doing anything destructive, make sure you are targeting the right device:

```bash
# List block devices before plugging in the USB
lsblk

# Plug in the USB drive, then run again
lsblk

# The new device is your USB drive - typically /dev/sdb or /dev/sdc
# Also check with:
sudo fdisk -l

# Or use dmesg to see what was just attached
dmesg | tail -20
```

Confirm the device size matches what you expect. Formatting the wrong device will destroy data.

## Wiping the Drive Before Encryption (Optional but Recommended)

For drives that previously held sensitive data, fill the device with random data before creating the LUKS container. This makes it harder to determine what parts of the drive were actually used:

```bash
# Fill with random data - takes time, proportional to drive size
# Replace /dev/sdb with your device
sudo dd if=/dev/urandom of=/dev/sdb bs=4M status=progress

# Faster alternative using openssl
sudo openssl enc -aes-256-ctr \
  -pass pass:"$(dd if=/dev/urandom bs=128 count=1 2>/dev/null | base64)" \
  -nosalt < /dev/zero | \
  sudo dd of=/dev/sdb bs=4M status=progress
```

## Creating the Encrypted Partition

### Method 1: Encrypt the Whole Drive (No Partition Table)

For simplicity, you can put LUKS directly on the raw device with no partition table. This works fine for a dedicated encrypted drive:

```bash
# Create a LUKS2 container on the entire device
sudo cryptsetup luksFormat --type luks2 /dev/sdb

# You will see a warning and be asked to type YES in uppercase
# Then enter and confirm your passphrase
```

### Method 2: Partition First, Then Encrypt

If you want a more structured approach, or need to keep some unencrypted space:

```bash
# Create a GPT partition table and a single partition
sudo parted /dev/sdb --script \
  mklabel gpt \
  mkpart primary 0% 100%

# Check the partition was created
lsblk /dev/sdb

# Format the partition with LUKS
sudo cryptsetup luksFormat --type luks2 /dev/sdb1
```

## Opening the Container and Creating a Filesystem

```bash
# Open the LUKS container - creates /dev/mapper/usb_encrypted
sudo cryptsetup open /dev/sdb usb_encrypted

# Create a filesystem inside the container
# ext4 works everywhere on Linux
sudo mkfs.ext4 -L "SecureUSB" /dev/mapper/usb_encrypted

# Or use exFAT if you need cross-platform compatibility
# (requires installing exfatprogs first)
sudo apt install -y exfatprogs
sudo mkfs.exfat -n "SecureUSB" /dev/mapper/usb_encrypted
```

## Mounting and Using the Encrypted Drive

```bash
# Create a mount point
sudo mkdir -p /mnt/usb_encrypted

# Mount the filesystem
sudo mount /dev/mapper/usb_encrypted /mnt/usb_encrypted

# Set permissions so your user can write to it
sudo chown $USER:$USER /mnt/usb_encrypted

# Now use it normally
cp sensitive-document.pdf /mnt/usb_encrypted/
ls -la /mnt/usb_encrypted/
```

## Safely Unmounting and Locking

```bash
# Unmount the filesystem
sudo umount /mnt/usb_encrypted

# Close (lock) the LUKS container
sudo cryptsetup close usb_encrypted

# Now safe to remove the USB drive
```

## GNOME Automatic Handling

If you are running a GNOME desktop, Ubuntu will automatically prompt for the LUKS passphrase when you plug in an encrypted drive. After entering it, GNOME mounts the volume and it appears in the file manager.

To use this automatic flow, the drive needs to be formatted with the LUKS header at the start of the device or partition, which is the default when using `cryptsetup luksFormat`.

## Adding Multiple Passphrases

LUKS supports up to 8 key slots by default (32 with LUKS2). This lets you give different people different passphrases, or have a backup passphrase stored securely:

```bash
# Add a second passphrase (you will be asked for an existing passphrase first)
sudo cryptsetup luksAddKey /dev/sdb

# List which key slots are active
sudo cryptsetup luksDump /dev/sdb | grep "Key Slot"

# Remove a passphrase (careful - do not remove all of them)
# You will be prompted for the passphrase you want to remove
sudo cryptsetup luksRemoveKey /dev/sdb
```

## Adding a Key File for Convenient Access

Typing a long passphrase every time gets tedious. A key file stored on your laptop can unlock the drive automatically:

```bash
# Generate a random key file
sudo dd if=/dev/urandom of=/etc/luks-keys/usb.key bs=4096 count=1
sudo chmod 400 /etc/luks-keys/usb.key
sudo mkdir -p /etc/luks-keys

# Add the key file as an authorized key
sudo cryptsetup luksAddKey /dev/sdb /etc/luks-keys/usb.key

# Now you can open the drive without typing a passphrase
sudo cryptsetup open --key-file /etc/luks-keys/usb.key /dev/sdb usb_encrypted
```

Note that this convenience comes with a trade-off: if your laptop is stolen along with the USB drive, the attacker has both the key file and the encrypted data. Consider whether this is acceptable for your threat model.

## Checking Encryption Status

```bash
# Verify the drive is encrypted
sudo cryptsetup isLuks /dev/sdb && echo "Is LUKS" || echo "Not LUKS"

# Show detailed LUKS information
sudo cryptsetup luksDump /dev/sdb

# Show cipher and key size
sudo cryptsetup luksDump /dev/sdb | grep -E "Cipher|Key-Size"
```

## Cross-Platform Access

If you need to access the encrypted drive from Windows or macOS:

**Windows**: LibreCrypt or VeraCrypt can read LUKS2 volumes. Alternatively, use VeraCrypt format from the start if cross-platform access is a primary requirement.

**macOS**: macFUSE with the cryptsetup port can handle LUKS volumes, though setup is involved.

For purely cross-platform encrypted storage, VeraCrypt containers are often more practical than LUKS. But if your drive stays in the Linux ecosystem, LUKS is simpler and better-integrated.

## Backing Up the LUKS Header

The LUKS header contains the metadata needed to decrypt the drive. If it gets corrupted (early sectors of a USB drive are fragile), the data is unrecoverable even with the correct passphrase:

```bash
# Back up the LUKS header
sudo cryptsetup luksHeaderBackup /dev/sdb \
  --header-backup-file ~/usb-luks-header-backup.img

# Store this backup on a separate, secure location
# Do NOT store it on the same USB drive
```

## Handling a Lost Passphrase

If you forget the passphrase and have no backup key, the data is gone. LUKS has no backdoor and no recovery mechanism by design. Write down passphrases for drives with important data, or store them in a password manager.

This is a feature, not a bug - it is what makes encryption meaningful.

## Performance Notes

USB drives are generally slower than internal SSDs, so encryption overhead is less noticeable. The bottleneck is almost always the USB interface speed, not the AES encryption. On modern hardware with AES-NI support:

```bash
# Check AES hardware acceleration
grep -c aes /proc/cpuinfo

# Benchmark encryption on your drive
sudo cryptsetup benchmark
```

You will typically see several hundred megabytes per second for AES operations, which exceeds what most USB 3.0 drives can sustain anyway.

Encrypting USB drives takes a few minutes to set up and adds essentially zero friction to everyday use. The protection it provides against a lost or stolen drive is worth the one-time setup effort.

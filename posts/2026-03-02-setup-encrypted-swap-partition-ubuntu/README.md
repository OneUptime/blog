# How to Set Up Encrypted Swap Partition on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, SWAP, LUKS

Description: Learn how to configure an encrypted swap partition on Ubuntu to prevent sensitive data from being written to unencrypted disk space, covering both random-key and LUKS-based approaches.

---

Swap space extends your system's effective memory by using disk storage to hold pages that do not fit in RAM. The problem is that any data in RAM can end up in swap - including encryption keys, passwords, session tokens, and other sensitive material. If swap is unencrypted, that data sits on disk in plaintext and can be recovered even after a reboot.

On a system where you are using LUKS encryption for your root and data partitions, leaving swap unencrypted creates a gap in your security. This guide covers how to close that gap on Ubuntu.

## Two Approaches to Encrypted Swap

### Random-Key Encryption (Volatile Swap)

The simplest approach uses a new random key each time the system boots. The swap partition is encrypted with this key and the key is discarded on shutdown. This means swap data is never recoverable after a reboot, but also means **you cannot use hibernation** - the RAM contents written to swap during hibernate would be unrecoverable after boot.

### LUKS-Based Encrypted Swap (Persistent Key)

This approach uses a LUKS-encrypted partition with a passphrase or key file. It supports hibernation but requires more setup and key management. The swap key can be derived from the root filesystem's LUKS key to avoid entering separate passphrases.

## Method 1: Random-Key Encrypted Swap

This is the recommended approach for systems that do not use hibernation.

### Step 1: Identify Your Swap Partition

Check your current swap setup:

```bash
swapon --show
cat /proc/swaps
lsblk
```

Note the device name (e.g., `/dev/sda2` or `/dev/nvme0n1p2`).

### Step 2: Disable Current Swap

```bash
sudo swapoff -a
```

### Step 3: Configure /etc/crypttab

Edit the crypttab file to set up encrypted swap:

```bash
sudo nano /etc/crypttab
```

Add a line for your swap partition:

```
# Format: <name>  <device>  <key>  <options>
cryptswap1  /dev/sda2  /dev/urandom  swap,cipher=aes-xts-plain64,size=256
```

Breaking down the options:
- `cryptswap1` - the name for the decrypted swap device
- `/dev/sda2` - the raw swap partition device
- `/dev/urandom` - tells cryptsetup to generate a random key on each boot
- `swap` - tells cryptsetup this is swap (adds additional safety checks)
- `cipher=aes-xts-plain64` - the encryption cipher
- `size=256` - key size in bits

### Step 4: Configure /etc/fstab

Update fstab to use the encrypted swap device instead of the raw partition:

```bash
sudo nano /etc/fstab
```

Remove or comment out the existing swap line:

```
# Comment out the old swap line:
# /dev/sda2  none  swap  sw  0  0

# Add the encrypted swap:
/dev/mapper/cryptswap1  none  swap  sw  0  0
```

### Step 5: Reboot and Verify

```bash
sudo reboot
```

After rebooting:

```bash
# Verify swap is active
swapon --show

# Verify encryption is in place
sudo dmsetup status cryptswap1
```

The output should show the swap device is active and using DM-Crypt.

## Method 2: LUKS Encrypted Swap (For Hibernation Support)

If you need hibernation, the swap partition must be persistently encrypted with a known key.

### Step 1: Create the LUKS Container on the Swap Partition

First, disable swap:

```bash
sudo swapoff -a
```

Create a LUKS2 container on the swap partition:

```bash
sudo cryptsetup luksFormat --type luks2 /dev/sda2
```

Enter a strong passphrase when prompted.

### Step 2: Open the LUKS Container

```bash
sudo cryptsetup luksOpen /dev/sda2 cryptswap1
```

### Step 3: Initialize Swap on the Decrypted Device

```bash
sudo mkswap /dev/mapper/cryptswap1
```

Note the UUID reported by mkswap - you may need it.

### Step 4: Configure /etc/crypttab

```bash
sudo nano /etc/crypttab
```

```
# Use the LUKS partition - no key file means prompt at boot
cryptswap1  /dev/sda2  none  luks
```

### Step 5: Configure /etc/fstab

```bash
sudo nano /etc/fstab
```

```
/dev/mapper/cryptswap1  none  swap  sw  0  0
```

### Step 6: Update Initramfs

```bash
sudo update-initramfs -u -k all
```

### Key File-Based LUKS Swap (No Boot Prompt)

To avoid entering a passphrase for swap at every boot, create a key file and store it on the (already encrypted) root filesystem:

```bash
# Generate a key file on the encrypted root partition
sudo dd if=/dev/urandom of=/etc/luks/swap.key bs=1 count=4096
sudo chmod 600 /etc/luks/swap.key

# Add the key file to the swap partition's LUKS key slots
sudo cryptsetup luksAddKey /dev/sda2 /etc/luks/swap.key
```

Update `/etc/crypttab` to use the key file:

```
cryptswap1  /dev/sda2  /etc/luks/swap.key  luks
```

Since the key file lives on the encrypted root partition, it is only accessible after the root partition is unlocked, maintaining the security chain.

## Verifying Encryption is Active

After setup, confirm swap is encrypted:

```bash
# Check that swap is on the mapper device, not the raw partition
swapon --show

# Should show /dev/mapper/cryptswap1, not /dev/sda2

# Check dm-crypt status
sudo dmsetup ls --target crypt

# Inspect the mapping
sudo dmsetup info cryptswap1
```

Also confirm no sensitive data is being swapped in plaintext:

```bash
# Check /proc/swaps
cat /proc/swaps

# Verify the device is a mapper device
ls -la /dev/mapper/cryptswap1
```

## Encrypted Swap with Swapfile Instead of Partition

If you use a swapfile rather than a dedicated swap partition, the situation is different. Swapfiles on LUKS-encrypted filesystems are automatically encrypted because the filesystem itself is encrypted.

Verify your root filesystem is encrypted:

```bash
# Check if root is on a dm-crypt device
lsblk -o NAME,TYPE,FSTYPE,MOUNTPOINT | grep -E "crypt|/"
```

If the root filesystem is encrypted, any swapfile on it inherits that encryption. Hibernation with an encrypted swapfile requires additional configuration involving the `resume=` kernel parameter pointing to the encrypted device.

## Hibernation Configuration

For hibernation to work with encrypted swap, the kernel needs to know where to find the swap device to resume from:

```bash
# Find the UUID of the LUKS swap device
sudo cryptsetup luksUUID /dev/sda2
```

Edit the GRUB configuration:

```bash
sudo nano /etc/default/grub
```

Add the resume parameter:

```
GRUB_CMDLINE_LINUX="... resume=/dev/mapper/cryptswap1"
```

Update GRUB and initramfs:

```bash
sudo update-grub
sudo update-initramfs -u -k all
```

## Summary

Encrypting swap closes an important gap in disk encryption coverage. For most servers without hibernation requirements, the random-key approach in `/etc/crypttab` is the easiest and most secure option - swap data is protected at rest and irrecoverable after shutdown. For laptops and workstations that use hibernation, LUKS-based swap with a key file stored on the encrypted root partition provides the necessary persistence while maintaining the security chain. Either approach prevents sensitive in-memory data from being recoverable through an unencrypted swap partition.

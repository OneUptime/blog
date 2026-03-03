# How to Configure Encrypted Swap on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, System Administration

Description: Learn how to configure encrypted swap on Ubuntu to prevent sensitive data from being written to disk in plaintext, protecting your system from cold boot and swap-based attacks.

---

Swap space is a necessary part of most Linux systems. When RAM fills up, the kernel moves less-used memory pages to swap, freeing up physical RAM for active processes. The problem is that swap can contain fragments of sensitive data: passwords, private keys, session tokens, database credentials, or any other in-memory content that gets paged out.

Without encryption, that data sits on disk in plaintext. Anyone with physical access to the drive - or who can read a disk image - can potentially recover it. Encrypted swap closes this gap by ensuring that anything written to the swap partition or file is encrypted on the fly.

This guide covers two approaches: random-key encrypted swap (re-keyed every boot, simplest and most common) and persistent-key encrypted swap (for systems where swap needs to survive reboots, less common).

## Understanding the Threat Model

Before configuring encrypted swap, it helps to understand why it matters.

When a process accesses sensitive data, it lives in RAM. If the kernel decides to page out memory from that process to swap, the plaintext data lands on disk. Later, even after the process exits, that data may still sit in the swap area. On a standard LUKS-encrypted root system without encrypted swap, this is often the weakest link.

Encrypted swap protects against:
- Physical theft of the drive
- Forensic analysis of disk images
- Cold boot attacks where RAM contents are read after shutdown (combined with disk encryption)

It does not protect against an attacker with live root access on a running system.

## Checking Your Current Swap Setup

First, understand what swap you currently have configured.

```bash
# Show all swap areas
swapon --show

# Or use free to see swap totals
free -h

# Check /proc/swaps for detailed info
cat /proc/swaps
```

Also check `/etc/fstab` to see how swap is mounted at boot:

```bash
grep swap /etc/fstab
```

You might see a line like:
```text
/dev/sda2   none   swap   sw   0   0
```
or for a swap file:
```text
/swapfile   none   swap   sw   0   0
```

## Method 1: Random-Key Encrypted Swap (Recommended)

This is the most common approach. A new random encryption key is generated at each boot, so swap contents are destroyed on reboot. This is appropriate for most systems because swap data from a previous session is not needed after reboot.

### Step 1: Disable and Remove Existing Swap

```bash
# Turn off swap
sudo swapoff -a

# If using a swap file, you can delete it
# sudo rm /swapfile

# If using a swap partition, just leave the partition as-is
```

### Step 2: Configure crypttab for Random-Key Swap

Edit `/etc/crypttab` to tell the system to encrypt the swap device with a random key at boot:

```bash
sudo nano /etc/crypttab
```

Add a line in this format:
```text
# Format: name  device  key  options
# For a swap partition (/dev/sda2):
swap   /dev/sda2   /dev/urandom   swap,cipher=aes-xts-plain64,size=256,hash=sha256

# For a swap file, you need a slightly different approach (see Method 2)
```

The options explained:
- `swap` - tells cryptsetup this is a swap device
- `cipher=aes-xts-plain64` - the encryption cipher
- `size=256` - key size in bits
- `hash=sha256` - hash for key derivation (not really used with random key but required)

### Step 3: Update fstab to Use the Encrypted Device

Now update `/etc/fstab` to mount the mapped device (not the raw partition) as swap:

```bash
sudo nano /etc/fstab
```

Remove or comment out the old swap line and add:
```text
# Old line (comment this out):
# /dev/sda2   none   swap   sw   0   0

# New line using the mapped encrypted device:
/dev/mapper/swap   none   swap   sw   0   0
```

### Step 4: Test and Verify

```bash
# Update initramfs
sudo update-initramfs -u

# Reboot to apply changes
sudo reboot

# After reboot, verify swap is active and encrypted
swapon --show
cat /proc/swaps
ls -la /dev/mapper/swap
```

You should see `/dev/mapper/swap` listed as an active swap device.

## Method 2: Encrypted Swap File with Random Key

If you're using a swap file rather than a dedicated partition, the approach is slightly different because `crypttab` works with block devices, not files directly.

### Create a Fixed-Size File as a Loop Device

```bash
# Create a 4GB swap file (adjust size as needed)
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress

# Set permissions
sudo chmod 600 /swapfile

# Set up as a loop device
sudo losetup /dev/loop0 /swapfile
```

### Configure crypttab for the Loop Device

```bash
sudo nano /etc/crypttab
```

```text
# Use the loop device as the underlying block device
swap   /dev/loop0   /dev/urandom   swap,cipher=aes-xts-plain64,size=256
```

For persistent loop device setup at boot, you need a systemd unit or an `/etc/rc.local` entry to set up the loop device before `crypttab` is processed. This complexity is one reason a dedicated swap partition is generally simpler.

## Method 3: LUKS-Encrypted Swap Partition (Persistent Key)

If you need persistent swap that survives reboots (rare, but some hibernation setups require it), you can set up LUKS directly on the swap partition. Note: standard hibernation with encrypted swap requires additional configuration beyond what's covered here.

```bash
# Format the partition with LUKS
sudo cryptsetup luksFormat /dev/sda2

# Open the LUKS container
sudo cryptsetup open /dev/sda2 swap

# Format as swap
sudo mkswap /dev/mapper/swap

# Enable swap
sudo swapon /dev/mapper/swap
```

Configure `/etc/crypttab` (without the `swap` option, and pointing to a keyfile or prompting for password):

```text
# crypttab entry for persistent LUKS swap
swap   /dev/sda2   none   luks
```

And `/etc/fstab`:
```text
/dev/mapper/swap   none   swap   sw   0   0
```

## Verifying Encryption is Active

After setup, confirm everything is working correctly:

```bash
# Check swap is active
swapon --show

# Check the mapper device exists
ls -la /dev/mapper/

# Check dmsetup to see the encryption parameters
sudo dmsetup table swap

# Check cryptsetup status
sudo cryptsetup status swap
```

The `dmsetup table` output will show the cipher and key size being used.

## Performance Considerations

Encrypted swap does add some CPU overhead. On modern systems with AES-NI hardware acceleration, this is typically negligible. You can verify AES-NI support:

```bash
# Check for AES-NI support
grep -m1 aes /proc/cpuinfo

# Check available ciphers and benchmark
sudo cryptsetup benchmark
```

The benchmark output shows MB/s throughput for various cipher modes. `aes-xts-plain64` with 256-bit keys is a solid default.

## Troubleshooting Common Issues

**Swap not activating after reboot:**
```bash
# Check systemd journal for errors
journalctl -xe | grep -i swap
journalctl -xe | grep -i crypt

# Check that crypttab is being processed
systemctl status systemd-cryptsetup@swap.service
```

**"Device or resource busy" error:**
```bash
# Make sure swap is fully disabled before making changes
sudo swapoff -a
cat /proc/swaps  # Should show nothing
```

**Wrong device name in crypttab:**
```bash
# Use UUID instead of device name to avoid naming changes across reboots
# Find UUID of your swap partition
sudo blkid /dev/sda2

# Use it in crypttab:
# swap   UUID=your-uuid-here   /dev/urandom   swap,cipher=aes-xts-plain64,size=256
```

Using UUIDs is more robust than device names like `/dev/sda2`, which can change if you add or remove drives.

## Summary

Encrypted swap is a straightforward addition to a security-conscious Ubuntu setup. The random-key method (using `/dev/urandom` as the key source in `crypttab`) is appropriate for most systems - it adds no password prompts at boot, has minimal performance impact on modern hardware, and ensures that swap contents are unreadable after shutdown. Pair it with full-disk encryption on your root partition and you significantly reduce the risk of sensitive data exposure if the physical drive is ever compromised.

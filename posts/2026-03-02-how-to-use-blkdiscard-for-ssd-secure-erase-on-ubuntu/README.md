# How to Use blkdiscard for SSD Secure Erase on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, SSD, Security, Disk Management

Description: Use blkdiscard and ATA Secure Erase on Ubuntu to securely wipe SSDs before decommissioning or reuse, ensuring data cannot be recovered from NAND flash cells.

---

Wiping an SSD requires a different approach than wiping a spinning disk. Traditional tools like `shred` write data over logical blocks, but SSDs use wear leveling and overprovisioning that means data may remain in areas that the OS cannot directly address. The correct approaches for SSDs are either the ATA Secure Erase command, which tells the SSD controller to cryptographically erase all data, or using `blkdiscard` (TRIM) to mark all blocks as empty.

This guide covers both methods along with their limitations and when to use each.

## Understanding SSD Erasure

### Why Traditional Wiping Fails on SSDs

On a spinning disk, writing zeros to every sector effectively erases the data. On an SSD:

- The controller manages a translation layer (FTL) between logical addresses and physical NAND cells
- Wear leveling distributes writes across cells, so writing to a logical address doesn't necessarily overwrite the same physical cell
- Overprovisioned areas are not accessible by the OS at all
- Data in these inaccessible areas survives a full logical write of zeros

### Appropriate Methods

1. **blkdiscard / TRIM:** Marks all blocks as unused and asks the controller to erase them. The controller handles the physical erasure. Fast, but depends on the controller to actually erase.

2. **ATA Secure Erase (hdparm):** A hardware command that instructs the controller to erase all cells including overprovisioned space. The most thorough software-level approach.

3. **Self-encrypting drives (SED):** Throw away the encryption key. Instant and cryptographically complete.

## Using blkdiscard

`blkdiscard` sends a TRIM command to all blocks on a device, telling the controller they are free. Most modern SSDs will erase the data promptly.

### Check TRIM Support

```bash
# Check if the drive supports TRIM (discard)
lsblk --discard /dev/sda

# Look for non-zero values in DISC-GRAN and DISC-MAX
# DISC-GRAN: Discard granularity - minimum block size for TRIM
# DISC-MAX: Maximum discard size

# Alternative check
sudo hdparm -I /dev/sda | grep -i "trim\|discard"
```

### Running blkdiscard

**Warning:** This operation cannot be undone. Verify the device name carefully.

```bash
# Identify the target drive
lsblk
# Make absolutely sure /dev/sdX is the correct device

# If the drive is mounted, unmount it first
sudo umount /dev/sda1
sudo umount /dev/sda2
# etc.

# For drives that are part of an LVM or RAID, deactivate first
# sudo vgchange -an vgname
# sudo mdadm --stop /dev/md0

# Basic blkdiscard - discards the entire device
sudo blkdiscard /dev/sda
```

The command completes quickly - it sends the discard command to the controller but does not wait for the physical erasure to complete.

### Secure (Forced) Blkdiscard

Some drives implement TRIM but do not immediately erase data - they just mark blocks as free and erase when convenient. For secure erasure, use the `--secure` flag if the drive supports it:

```bash
# Attempt secure discard (ATA DATA SET MANAGEMENT with security bit)
sudo blkdiscard --secure /dev/sda
```

Not all drives support this. If the drive does not support it, `blkdiscard --secure` falls back to a regular discard.

### Discarding Specific Ranges

You can also discard specific ranges rather than the entire device:

```bash
# Discard a specific range: offset and length in bytes
# This discards 100GB starting from offset 0
sudo blkdiscard --offset 0 --length $((100 * 1024 * 1024 * 1024)) /dev/sda

# Discard a specific partition
sudo blkdiscard /dev/sda1
```

### Verbose Mode

```bash
# Run with verbose output to see progress
sudo blkdiscard --verbose /dev/sda
```

## Using ATA Secure Erase with hdparm

ATA Secure Erase is a hardware command that is more comprehensive than TRIM. It instructs the SSD controller to erase all cells including overprovisioned areas.

### Check ATA Secure Erase Support

```bash
# Install hdparm
sudo apt install hdparm -y

# Check if the drive supports Secure Erase
sudo hdparm -I /dev/sda | grep -A 3 "Security"
```

Look for output like:

```
Security:
    Master password revision code = 65534
        supported
    not enabled
    not locked
    not frozen
    not expired: security count
        supported: enhanced erase
```

If you see "frozen," you cannot run Secure Erase. See the frozen state section below.

### Unfreezing a Frozen Drive

The BIOS often "freezes" drives at boot for security. To unfreeze:

```bash
# Method 1: System suspend/resume cycle unfreezes drives
sudo systemctl suspend
# Wait for the system to sleep, then wake it
# Check again
sudo hdparm -I /dev/sda | grep -A 3 "Security"
```

Alternatively, hot-plug the drive if your hardware supports it: physically disconnect and reconnect the SATA cable while the system is running.

### Setting a Temporary Password

ATA Secure Erase requires the drive to have a security password set:

```bash
# Set a temporary password (use any string - it will be cleared after erase)
sudo hdparm --user-master u --security-set-pass TemporaryPassword /dev/sda

# Verify password is set
sudo hdparm -I /dev/sda | grep -A 5 "Security"
# Should show "enabled" now
```

### Running ATA Secure Erase

```bash
# Run ATA Secure Erase
# This will take time - "Enhanced erase" takes a few minutes on most drives
sudo hdparm --user-master u --security-erase TemporaryPassword /dev/sda

# Or "enhanced" secure erase (more thorough, drive-specific)
sudo hdparm --user-master u --security-erase-enhanced TemporaryPassword /dev/sda
```

After the command completes, the drive's security password is cleared and all data is erased.

### Verifying the Erase

```bash
# Check that security is now disabled (password cleared)
sudo hdparm -I /dev/sda | grep -A 5 "Security"
# Should show "not enabled"

# Try to read from the drive - should get mostly zeros or random data
sudo dd if=/dev/sda bs=512 count=10 | od -x | head -20
```

## NVMe Drives

NVMe drives use different commands than SATA. Use `nvme-cli`:

```bash
sudo apt install nvme-cli -y

# List NVMe devices
sudo nvme list

# Check for Sanitize support (NVMe's equivalent of Secure Erase)
sudo nvme id-ctrl /dev/nvme0 | grep -i "sanicap\|sani"

# Run Format (erase) on NVMe drive
# ses=1: Cryptographic erase (if drive is self-encrypting)
# ses=2: User data erase
sudo nvme format /dev/nvme0n1 --ses=1
# Or:
sudo nvme format /dev/nvme0n1 --ses=2

# Alternative: Sanitize command (more thorough, writes pattern)
sudo nvme sanitize /dev/nvme0 --sanact=4    # Block erase sanitize
```

## Verifying TRIM is Working Regularly

For drives in regular use, periodic TRIM keeps performance up and prevents data buildup:

```bash
# Check if fstrim timer is enabled
systemctl status fstrim.timer

# Enable periodic TRIM (weekly by default)
sudo systemctl enable fstrim.timer
sudo systemctl start fstrim.timer

# Run TRIM manually on all supported filesystems
sudo fstrim -av
```

## Decommissioning Checklist

Before returning, selling, or disposing of an SSD:

```bash
# 1. Verify the device path
lsblk -o NAME,SIZE,MODEL,SERIAL

# 2. Check for mounted partitions
mount | grep /dev/sda

# 3. Unmount all partitions
sudo umount /dev/sda*

# 4. Disable swap if on the drive
sudo swapoff /dev/sda2

# 5. Deactivate LVM if applicable
sudo vgchange -an

# 6. Run blkdiscard (fast, requires TRIM support)
sudo blkdiscard /dev/sda

# 7. Or run ATA Secure Erase (more thorough)
sudo hdparm --user-master u --security-set-pass temp /dev/sda
sudo hdparm --user-master u --security-erase-enhanced temp /dev/sda

# 8. Verify the drive is clear
sudo dd if=/dev/sda bs=1M count=100 | od -x | grep -v "0000000 0000 0000 0000 0000"
# Should produce no output if all zeros
```

## Limitations and Warnings

**blkdiscard is not guaranteed:** The SSD controller may not immediately erase discarded blocks. If security is critical, use ATA Secure Erase or physical destruction.

**Encrypted drives:** If the drive uses hardware encryption and you destroy the key (via Secure Erase), the data is unrecoverable regardless of what the physical cells contain.

**Enterprise vs consumer drives:** Enterprise SSDs often have more reliable Secure Erase implementations. Consumer drives vary significantly.

**Physical destruction:** For high-security environments, physical destruction (shredding, degaussing-equivalent via certified destruction) remains the most reliable method.

`blkdiscard` combined with ATA Secure Erase covers most decommissioning scenarios and significantly reduces the risk of data recovery from discarded SSDs.

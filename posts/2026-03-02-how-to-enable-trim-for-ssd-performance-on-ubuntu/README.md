# How to Enable TRIM for SSD Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSD, Storage, Performance, System Administration

Description: Enable and configure TRIM on Ubuntu to maintain SSD performance over time, covering both periodic fstrim and continuous discard mount options with a comparison of when to use each.

---

SSDs write data in large blocks but can only erase data at the block level. When you delete a file, the operating system marks those blocks as free, but the SSD doesn't know they're available until explicitly told via a TRIM command. Without TRIM, the SSD's internal garbage collector doesn't know which blocks contain deleted data, leading to write performance degradation as the drive fills up with blocks that need to be erased before they can be reused.

Ubuntu supports TRIM through two mechanisms: periodic `fstrim` (recommended) and continuous `discard` mount option (less recommended for most workloads). Modern Ubuntu installs handle this automatically, but it's worth understanding what's configured and how to verify it.

## Verifying SSD TRIM Support

Before configuring TRIM, confirm your SSD supports it:

```bash
# Check TRIM support for all block devices
sudo hdparm -I /dev/sda | grep -i trim

# If TRIM is supported, you'll see:
# *    Data Set Management TRIM supported (limit 8 LBA ranges)
```

For NVMe drives:

```bash
# NVMe drives always support TRIM (called DEALLOCATE in NVMe)
sudo nvme id-ctrl /dev/nvme0 | grep -i "dsm\|deallocate"
```

Check via lsblk for the DISC-GRAN and DISC-MAX columns:

```bash
lsblk -o NAME,DISC-GRAN,DISC-MAX
```

Output:

```
NAME        DISC-GRAN DISC-MAX
sda               512B    2G
├─sda1            512B    2G    # Non-zero values = TRIM supported
└─sda2            512B    2G
nvme0n1         512B    2G
```

A `DISC-GRAN` of 0 means the device doesn't support TRIM (it's likely an HDD or a virtual disk that doesn't pass TRIM through).

## Method 1: Periodic TRIM with fstrim (Recommended)

Ubuntu enables a weekly `fstrim.timer` systemd service by default. This runs `fstrim` on all mounted filesystems that support it, once per week.

### Check the timer status

```bash
# See if the timer is active
sudo systemctl status fstrim.timer

# Check when it last ran and next scheduled run
sudo systemctl list-timers fstrim.timer
```

Output:

```
NEXT                         LEFT     LAST                         PASSED       UNIT          ACTIVATES
Mon 2026-03-09 00:00:00 UTC  6d left  Mon 2026-03-02 00:15:00 UTC  9h ago       fstrim.timer  fstrim.service
```

### Enable the timer if it's not running

```bash
sudo systemctl enable fstrim.timer
sudo systemctl start fstrim.timer
```

### Run fstrim manually

```bash
# Trim all mounted filesystems that support it
sudo fstrim -av
```

Output:

```
/boot/efi: 208 MiB (218234880 bytes) trimmed on /dev/sda1
/boot: 721 MiB (756023296 bytes) trimmed on /dev/sda2
/: 15.5 GiB (16676339712 bytes) trimmed on /dev/sda3
```

The output shows how much space was communicated to the SSD as free. The `trimmed` amount is how much data space (not the space recovered) was reported to the SSD.

```bash
# Trim a specific mount point
sudo fstrim -v /

# Trim all filesystems
sudo fstrim -va
```

### Configure fstrim frequency

The default weekly timer is appropriate for most workloads. For write-heavy workloads, you might want more frequent TRIM:

```bash
# View the current timer configuration
cat /lib/systemd/system/fstrim.timer
```

```ini
[Unit]
Description=Discard unused blocks once a week
Documentation=man:fstrim

[Timer]
OnCalendar=weekly
AccuracySec=1h
Persistent=true

[Install]
WantedBy=timers.target
```

Override to run daily:

```bash
sudo systemctl edit fstrim.timer
```

Add:

```ini
[Timer]
OnCalendar=daily
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart fstrim.timer
```

## Method 2: Continuous TRIM with discard Mount Option

The `discard` mount option tells the filesystem to issue TRIM commands immediately whenever blocks are freed (file deletion, truncation). This is real-time TRIM.

```bash
# Mount with continuous discard
sudo mount -o discard /dev/sda3 /

# In /etc/fstab:
UUID=abc12345  /  ext4  defaults,discard  0  1
```

### Why periodic fstrim is usually better than continuous discard

Continuous discard has downsides:

1. **Performance overhead**: Each delete operation issues a TRIM command synchronously, adding latency to delete operations
2. **Increased write amplification on some SSDs**: Frequent small TRIM commands are less efficient than batched ones
3. **LVM compatibility**: TRIM with LVM requires `issue_discards = 1` in `/etc/lvm/lvm.conf`, and the LVM layer needs to be configured separately
4. **SSD firmware quality varies**: Some older SSD firmware handles continuous discard poorly

For most workloads, weekly `fstrim` is the right choice. Use `discard` only if:
- You have a workload where SSD performance degrades significantly between weekly runs
- The SSD manufacturer specifically recommends it
- Your SSD is high-quality enterprise hardware with known-good discard handling

## TRIM Through LVM

When using LVM, TRIM requests need to pass through the LVM layer:

```bash
# Enable discard passthrough in LVM
sudo nano /etc/lvm/lvm.conf
```

Find and set:

```
issue_discards = 1
```

Then update the initramfs:

```bash
sudo update-initramfs -u
```

Run fstrim on the LVM volume:

```bash
sudo fstrim -av
```

## TRIM on Encrypted Disks (LUKS)

TRIM on LUKS-encrypted drives is a security-privacy tradeoff: enabling TRIM leaks information about which blocks are in use (an attacker can tell which blocks have data), but without TRIM, SSD performance degrades. Evaluate this tradeoff for your threat model.

To enable TRIM on LUKS:

```bash
# Check if discard is enabled for LUKS device
sudo cryptsetup status /dev/mapper/cryptdisk | grep "flags"

# Enable discard in /etc/crypttab
sudo nano /etc/crypttab
```

Add `discard` to the options column:

```
# <name>    <device>    <keyfile>   <options>
cryptdisk   UUID=xxx    none        luks,discard
```

Then run `sudo update-initramfs -u` and reboot.

## Verifying TRIM is Working

After running fstrim, verify the SSD received the commands:

```bash
# Run fstrim and check output
sudo fstrim -v /
# Should show a non-zero "trimmed" amount

# Check SSD health (good SSD firmware reports TRIM in attributes)
sudo smartctl -a /dev/sda | grep -i "trim\|ata_232"

# For NVMe, check error statistics
sudo nvme smart-log /dev/nvme0 | grep -i "percent_used\|available_spare"
```

## ext4 vs XFS vs Btrfs TRIM Support

All three major Linux filesystems support TRIM:

```bash
# ext4: fstrim works, discard mount option works
sudo fstrim -v /

# XFS: fstrim works
sudo fstrim -v /data  # if /data is XFS

# Btrfs: fstrim works
sudo fstrim -v /btrfs-mount
# Btrfs also has its own defrag+discard
sudo btrfs filesystem defragment -r -c /data
```

For most Ubuntu server deployments, the default weekly `fstrim.timer` provides adequate SSD maintenance with minimal operational overhead. Verify it's enabled and running, check that your SSDs report TRIM support via `lsblk -o DISC-GRAN`, and run `sudo fstrim -av` after any large batch of file deletions if you want to immediately free up space on the SSD.

# How to Configure Btrfs RAID on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Btrfs, RAID, Storage, File System

Description: A practical guide to setting up Btrfs RAID profiles on Ubuntu for data redundancy and improved storage performance.

---

Btrfs has built-in RAID support that operates at the file system level, meaning you get data redundancy without a separate RAID controller or software layer like mdadm. This approach gives you copy-on-write semantics, checksumming, and snapshotting on top of RAID - benefits that traditional RAID setups simply don't offer.

This guide walks through creating and managing Btrfs RAID configurations on Ubuntu, covering the common RAID profiles and how to work with them day-to-day.

## Understanding Btrfs RAID Profiles

Btrfs supports several RAID profiles, each suited for different use cases:

- **RAID0** - Striping across devices, no redundancy. Maximum performance and capacity.
- **RAID1** - Mirroring. Each block written to at least two devices. Survives one drive failure.
- **RAID10** - Striped mirrors. Minimum four devices. Good performance and redundancy.
- **RAID5** - Distributed parity. Minimum three devices. Note: Btrfs RAID5/6 is still considered experimental and not recommended for production.
- **RAID6** - Double parity. Minimum four devices. Same caveat as RAID5.

For production use, RAID1 and RAID10 are the safest choices with Btrfs.

## Prerequisites

Make sure you have `btrfs-progs` installed:

```bash
sudo apt update
sudo apt install btrfs-progs
```

Identify the block devices you want to use. These should be raw, unformatted disks or partitions. Check available devices:

```bash
lsblk
# or
sudo fdisk -l
```

For this guide, assume you have `/dev/sdb`, `/dev/sdc`, and `/dev/sdd` available.

## Creating a Btrfs RAID1 File System

RAID1 with Btrfs mirrors both data and metadata across two or more devices:

```bash
# Create a Btrfs file system spanning /dev/sdb and /dev/sdc
# -d raid1 sets the data profile to RAID1
# -m raid1 sets the metadata profile to RAID1
sudo mkfs.btrfs -d raid1 -m raid1 /dev/sdb /dev/sdc
```

You can specify a label for easier identification:

```bash
sudo mkfs.btrfs -L "data-pool" -d raid1 -m raid1 /dev/sdb /dev/sdc
```

Check the result:

```bash
sudo btrfs filesystem show
```

Output will show both devices associated with the same file system UUID.

## Mounting the Btrfs RAID Array

With Btrfs multi-device arrays, mounting any one of the member devices mounts the entire array:

```bash
sudo mkdir -p /mnt/data
sudo mount /dev/sdb /mnt/data
```

Verify the mount and profile:

```bash
sudo btrfs filesystem df /mnt/data
```

Sample output:
```
Data, RAID1: total=10.00GiB, used=256.00MiB
System, RAID1: total=8.00MiB, used=16.00KiB
Metadata, RAID1: total=1.00GiB, used=112.00KiB
GlobalReserve, single: total=3.25MiB, used=0.00B
```

## Persistent Mount Configuration

Add the array to `/etc/fstab` using the file system UUID for reliable boot-time mounting:

```bash
# Get the UUID of the Btrfs array
sudo btrfs filesystem show | grep uuid
# Or use blkid
sudo blkid /dev/sdb
```

Edit `/etc/fstab`:

```bash
# Btrfs RAID1 array - using UUID ensures correct device identification
UUID=<your-uuid-here> /mnt/data btrfs defaults,nofail 0 0
```

The `nofail` option prevents boot failure if a device is missing, which is important for RAID arrays.

## Adding a Third Device to an Existing Array

You can extend a RAID1 array by adding more devices. With three devices in RAID1, Btrfs can write data copies to any two of the three:

```bash
# Add a new device to the existing mounted array
sudo btrfs device add /dev/sdd /mnt/data
```

After adding the device, rebalance the data to distribute it across all three drives:

```bash
# Balance the array - this may take a while on large arrays
sudo btrfs balance start /mnt/data
```

Check balance progress:

```bash
sudo btrfs balance status /mnt/data
```

## Creating a Btrfs RAID10 Array

RAID10 requires at least four devices and provides both striping and mirroring:

```bash
# Create RAID10 with four devices
sudo mkfs.btrfs -d raid10 -m raid10 /dev/sdb /dev/sdc /dev/sdd /dev/sde
```

RAID10 tolerates losing one drive per mirror pair, so you can lose up to two drives if they are in different pairs.

## Checking Array Health

Regularly scrubbing the array verifies data integrity and detects any corruption:

```bash
# Start a scrub operation
sudo btrfs scrub start /mnt/data

# Check scrub status
sudo btrfs scrub status /mnt/data
```

The scrub process reads all data and metadata, comparing checksums. Any errors are logged and corrected where possible using the redundant copy.

View overall filesystem statistics including error counters:

```bash
sudo btrfs device stats /mnt/data
```

Zero values across all error types indicate a healthy array.

## Handling a Failed Device

If a drive fails, the array continues operating (for RAID1/RAID10). Replace the failed device:

```bash
# Remove the failed device from the array (while mounted)
sudo btrfs device remove /dev/sdb /mnt/data

# Add the replacement device
sudo btrfs device add /dev/sdx /mnt/data

# Rebalance to distribute data to the new device
sudo btrfs balance start /mnt/data
```

If the failed device cannot be removed normally (it has been physically removed), use the missing keyword:

```bash
# Replace a physically absent device
sudo btrfs replace start -r /dev/sdx /mnt/data
```

## Monitoring with btrfs-usage

For a concise summary of space usage across the array:

```bash
sudo btrfs filesystem usage /mnt/data
```

This breaks down space by profile type, showing both raw device space and usable space after accounting for RAID overhead.

## Converting Between RAID Profiles

You can change the RAID profile of an existing array without unmounting it by running a balance with a filter:

```bash
# Convert data profile from single to RAID1
sudo btrfs balance start -dconvert=raid1 /mnt/data

# Convert metadata profile from single to RAID1
sudo btrfs balance start -mconvert=raid1 /mnt/data

# Convert both in one operation
sudo btrfs balance start -dconvert=raid1 -mconvert=raid1 /mnt/data
```

This is useful when you add a second device to a single-device Btrfs filesystem and want to enable mirroring.

## Automating Health Checks

Set up a cron job to run periodic scrubs:

```bash
# Edit root's crontab
sudo crontab -e

# Run a scrub on the first Sunday of each month at 2am
0 2 * * 0 [ $(date +\%d) -le 7 ] && /usr/bin/btrfs scrub start /mnt/data
```

Alternatively, the `btrfs-scrub` systemd timer (available in newer Ubuntu versions) handles this automatically if you enable it.

## Key Considerations

A few things worth knowing before relying on Btrfs RAID in production:

- **RAID5/RAID6 are not production-ready.** The write hole issue and ongoing stability concerns make them unsuitable for critical data.
- **Scrub regularly.** Btrfs checksumming only helps if you run scrubs to detect and fix errors proactively.
- **Monitor device stats.** Incrementing error counters in `btrfs device stats` are an early warning of drive problems.
- **Keep firmware and kernel updated.** Btrfs improvements ship with each kernel version, and some older kernels have known bugs with specific RAID operations.

Btrfs RAID gives you a storage layer that is both redundant and intelligent, combining checksumming, snapshots, and RAID into a single coherent filesystem. For Ubuntu servers where data integrity matters, it is worth the learning curve.

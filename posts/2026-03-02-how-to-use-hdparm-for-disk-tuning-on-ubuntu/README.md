# How to Use hdparm for Disk Tuning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, Performance, hdparm, Disk Management

Description: Use hdparm on Ubuntu to query disk parameters, measure read performance, tune power management settings, and configure advanced features on ATA/SATA drives.

---

`hdparm` is a command-line utility for querying and setting parameters on ATA, SATA, and SAS drives. It can read drive identity information, test raw read performance, configure power management and caching settings, and perform low-level operations like Secure Erase. While many of its older functions have been superseded by modern alternatives, it remains a useful diagnostic and tuning tool.

This guide covers the most practical hdparm uses for system administrators working with Ubuntu servers and workstations.

## Installing hdparm

```bash
sudo apt update
sudo apt install hdparm -y

# Verify installation
hdparm --version
```

## Identifying Drives

The `-I` flag queries a drive's ATA identity information, which includes model, firmware version, supported features, and security status:

```bash
# Show drive identity (ATA IDENTIFY command)
sudo hdparm -I /dev/sda

# Key information in the output:
# Model Number: The drive model
# Firmware Revision: Current firmware
# Transport: ATA/SATA version
# Enabled Supported features (DMA, LBA, etc.)
# Security section: encryption/password status
# Commands/features section: what the drive supports
```

For a shorter summary:

```bash
# Brief identity info
sudo hdparm -i /dev/sda | head -5
```

## Measuring Read Performance

The `-t` and `-T` flags test sequential read performance:

```bash
# Test raw device read speed (bypasses filesystem cache, tests drive + controller)
sudo hdparm -t /dev/sda

# Example output:
# /dev/sda:
#  Timing buffered disk reads: 1254 MB in  3.01 seconds = 416.61 MB/sec

# Test cached read speed (tests system memory + cache speed, not the drive)
sudo hdparm -T /dev/sda

# Run both tests together
sudo hdparm -Tt /dev/sda

# Run multiple times for a more accurate average
for i in {1..3}; do sudo hdparm -t /dev/sda; done
```

The `-t` test reads directly from the drive, bypassing the page cache. This gives a realistic measurement of drive throughput. The `-T` test shows how fast memory reads are, not the drive - it is useful for comparing systems but does not tell you about disk performance.

**Note:** Run these tests when the system is idle. Other disk activity will skew the results.

## Checking and Setting DMA Mode

Direct Memory Access (DMA) allows the drive to transfer data directly to RAM without CPU involvement. Modern systems use DMA by default, but you can verify:

```bash
# Check current DMA status
sudo hdparm -d /dev/sda

# Example output:
# /dev/sda:
#  using_dma    =  1 (on)

# Enable DMA (should already be on)
sudo hdparm -d 1 /dev/sda

# Disable DMA (diagnostic only - don't leave this disabled)
sudo hdparm -d 0 /dev/sda
```

## Read-Ahead Buffer Configuration

The read-ahead setting tells the kernel how much data to prefetch when sequential reads are detected. Increasing it can improve throughput for sequential workloads:

```bash
# Check current read-ahead setting (in 512-byte sectors)
sudo hdparm -a /dev/sda

# Show in KB (multiply sectors by 512)
sudo hdparm -a /dev/sda | awk '{print $3 * 512 / 1024 " KB"}'

# Increase read-ahead to 512 sectors (256 KB) for streaming workloads
sudo hdparm -a 512 /dev/sda

# Larger value for bulk data transfer (2048 sectors = 1 MB)
sudo hdparm -a 2048 /dev/sda

# Reset to default
sudo hdparm -a 256 /dev/sda
```

For NFS servers or backup systems reading large files sequentially, a larger read-ahead helps. For database servers with random I/O, a smaller value reduces unnecessary prefetching.

## Write Caching

Most drives have a write cache that buffers writes in memory before committing to platters. This improves write performance but risks data loss on power failure:

```bash
# Check write cache status
sudo hdparm -W /dev/sda

# Example output:
# /dev/sda:
#  write-caching =  1 (on)

# Disable write cache (safer for power outages, slower writes)
sudo hdparm -W 0 /dev/sda

# Enable write cache (faster, relies on UPS or filesystem journal)
sudo hdparm -W 1 /dev/sda
```

For servers on UPS power with filesystem journaling (ext4, XFS), write caching is safe to enable. For embedded systems without power protection, disabling the write cache prevents data corruption on power loss.

## Power Management Settings

hdparm can configure drive power management, which matters for laptops and servers where disk spin-down saves power:

```bash
# Check current standby setting
sudo hdparm -B /dev/sda    # Advanced power management

# APM values (1-127 = power saving, 128-254 = performance, 255 = off)
# -B 127: Maximum power saving (allows standby)
# -B 128: Minimum power saving with standby prevention
# -B 254: Maximum performance
# -B 255: Disable APM

# For server (no spin-down, maximum performance)
sudo hdparm -B 254 /dev/sda

# For laptop (allow spin-down after idle)
sudo hdparm -B 127 /dev/sda

# Spindown timeout (in units of 5 seconds, 0 = never)
# -S 120 = spin down after 600 seconds (10 minutes)
sudo hdparm -S 120 /dev/sda

# Disable spindown
sudo hdparm -S 0 /dev/sda
```

## Making Settings Persistent

hdparm settings reset on reboot. The `/etc/hdparm.conf` file applies settings automatically at boot:

```bash
sudo nano /etc/hdparm.conf
```

```ini
# /etc/hdparm.conf - persistent hdparm settings

# Settings for /dev/sda (SATA HDD)
/dev/sda {
    # Keep write cache enabled
    write_cache = on

    # Set read-ahead to 512 sectors
    read_ahead_sect = 512

    # Maximum performance power management
    apm = 254

    # Disable spindown (0 = never spin down)
    spindown_time = 0

    # Keep DMA enabled
    dma = on
}

# Settings for all disks matching a model
/dev/disk/by-id/ata-WDC_WD20EZRZ* {
    write_cache = on
    apm = 254
}
```

For settings applied by the boot-time script, verify the service is running:

```bash
sudo systemctl status hdparm.service
```

If the service does not exist (it may not on newer Ubuntu), create a simple udev-based approach instead:

```bash
sudo nano /etc/udev/rules.d/80-hdparm.rules
```

```ini
# Apply hdparm settings when drives appear
ACTION=="add", SUBSYSTEM=="block", KERNEL=="sd[a-z]", \
    ATTR{queue/rotational}=="1", \
    RUN+="/usr/sbin/hdparm -B 254 -S 0 -W 1 %N"
```

## Querying Drive Status

```bash
# Check if drive is in standby mode
sudo hdparm -C /dev/sda

# Output:
#  drive state is:  active/idle
# or:
#  drive state is:  standby

# Force drive to spin up from standby
sudo hdparm -S 0 /dev/sda
# Or simply read from it:
sudo dd if=/dev/sda bs=512 count=1 of=/dev/null
```

## Acoustic Management

Older HDDs support acoustic management, which trades seek performance for quieter operation by using slower seeks:

```bash
# Check acoustic management
sudo hdparm -M /dev/sda

# Set maximum performance (loudest)
sudo hdparm -M 254 /dev/sda

# Set minimum noise (slowest seeks) - 128 = quiet
sudo hdparm -M 128 /dev/sda

# Disable acoustic management
sudo hdparm -M 0 /dev/sda
```

Most modern drives do not support this feature. hdparm will report an error if unsupported.

## Feature Queries

```bash
# Check if drive supports specific features
sudo hdparm -I /dev/sda | grep -E "SMART|NCQ|TRIM|Sanitize|Security"

# Check NCQ (Native Command Queuing) queue depth
cat /sys/block/sda/device/queue_depth

# Check SMART status
sudo hdparm -H /dev/sda    # Check SMART health
# Or use smartmontools for detailed SMART data:
sudo apt install smartmontools -y
sudo smartctl -a /dev/sda
```

## Benchmarking Comparison

A practical workflow for testing drive performance before and after tuning:

```bash
#!/bin/bash
# Compare drive performance with different settings

DEVICE="/dev/sda"

echo "=== Baseline performance ==="
sudo hdparm -Tt $DEVICE

echo "=== Enabling write cache ==="
sudo hdparm -W 1 $DEVICE
sudo hdparm -t $DEVICE

echo "=== Setting larger read-ahead ==="
sudo hdparm -a 2048 $DEVICE
sudo hdparm -t $DEVICE

echo "=== Final settings ==="
sudo hdparm -Ia $DEVICE
```

## Troubleshooting

**"Bad/missing sense data" errors:** The drive firmware may not support the requested feature. Check which features are listed as supported in `hdparm -I` output.

**Settings not persisting:** Verify `/etc/hdparm.conf` exists and the hdparm service runs at boot. On Ubuntu 22.04+, check if there is a systemd service for hdparm or create a udev rule.

**Performance degraded after tuning:** Disable write cache (`hdparm -W 0`) if you see data corruption issues. High read-ahead settings can hurt random-access workloads by polluting the page cache.

**hdparm reports device is NVMe:** hdparm does not work with NVMe drives. Use `nvme-cli` for NVMe diagnostics and tuning.

hdparm remains a useful quick-diagnostic tool even as SSD and NVMe drives have become common. The benchmark test (`-Tt`) is particularly handy for spot-checking whether a new drive or controller is performing at its rated speed.

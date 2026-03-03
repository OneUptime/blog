# How to Use ddrescue for Disk Recovery on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ddrescue, Data Recovery, Disk, Storage

Description: A thorough guide to using GNU ddrescue on Ubuntu to recover data from failing drives, with coverage of mapfiles, retry strategies, and recovery workflows.

---

GNU ddrescue is the standard tool for cloning data from failing hard drives, SSDs, and other storage media. Unlike the basic `dd` command, ddrescue logs its progress to a mapfile (sometimes called a logfile) and implements a smart retry strategy that maximizes the amount of data recovered from bad media. This guide covers everything from basic usage to advanced recovery strategies.

## Why ddrescue Instead of dd

The `dd` command stops on the first read error. A failing drive may have only a few bad sectors scattered among gigabytes of good data, but `dd` will not retrieve any of it once it hits the first problem. `ddrescue` works differently:

1. First pass: copy all easily readable sectors as fast as possible
2. Second pass: focus on sectors that failed in the first pass, retrying multiple times
3. The mapfile records exactly which sectors succeeded and which failed, so recovery can be paused and resumed

This approach often recovers 99%+ of data from partially failed drives.

## Installing ddrescue

The package in Ubuntu is named `gddrescue` (GNU ddrescue, to distinguish it from another tool called `ddrescue`):

```bash
# Install GNU ddrescue
sudo apt update
sudo apt install gddrescue -y

# Verify the installation
ddrescue --version
```

The binary is named `ddrescue` after installation, not `gddrescue`.

## Understanding the Mapfile

The mapfile is the most important concept in ddrescue. It records the status of every sector on the source:

- `+` = sector successfully copied
- `-` = sector not yet tried
- `?` = sector failed during copy
- `/` = sector trimmed (partially processed)
- `*` = sector being split

Always use a mapfile. It turns a one-shot operation into a resumable, iterative process.

## Basic Syntax

```text
ddrescue [options] infile outfile [mapfile]
```

- `infile`: the failing source drive or partition
- `outfile`: the destination image file or drive
- `mapfile`: the progress log file

## Identifying Your Drives

Before running ddrescue, confirm you have the right drive identified:

```bash
# List all storage devices with sizes
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT

# Get detailed device information
sudo fdisk -l

# Check drive model and serial number
sudo hdparm -I /dev/sdb | grep -E "Model|Serial"
```

Never confuse source and destination. Writing to the wrong drive compounds the problem.

## First Recovery Pass

The first pass uses the `-n` flag (no split) to skip retrying bad sectors and collect all easily readable data:

```bash
# Basic first pass - read good sectors quickly
# Source: /dev/sdb (failing drive)
# Destination: /mnt/backup/disk.img (image on healthy drive)
# Mapfile: /mnt/backup/rescue.map
sudo ddrescue -f -n /dev/sdb /mnt/backup/disk.img /mnt/backup/rescue.map
```

Flags explained:
- `-f`: force overwrite of existing output file
- `-n`: no split - skip subdividing error areas on this pass

Watch the progress output. ddrescue shows:

```text
GNU ddrescue 1.25
     ipos:   12345 MB, non-trimmed:        0 B,  current rate:  80000 kB/s
     opos:   12345 MB, non-scraped:        0 B,  average rate:  75000 kB/s
non-tried:   2048 kB,  bad-sector:     2048 kB,    error rate:      0 B/s
  rescued:  499.9 GB,   bad areas:          5,        run time:   1h 52m
pct rescued:   99.99%, read errors:         12,  remaining time:      5m
```

The key fields:
- `rescued`: data successfully copied
- `bad areas`: regions with read errors
- `pct rescued`: percentage complete
- `remaining time`: estimated time to finish

## Second Pass - Retrying Bad Sectors

After the first pass, the mapfile records all problem areas. The second pass targets them:

```bash
# Second pass: retry bad sectors with direct I/O and up to 3 retries
sudo ddrescue -d -f -r3 /dev/sdb /mnt/backup/disk.img /mnt/backup/rescue.map
```

Flags:
- `-d`: use direct I/O (bypasses kernel cache, more reliable for bad sectors)
- `-r3`: retry each bad sector up to 3 times (use higher values for stubborn sectors, but diminishing returns set in quickly)

If the drive responds to retries, the rescued percentage will increase. Once the second pass completes, check the mapfile:

```bash
# Summary of mapfile status
ddrescue --show-status /mnt/backup/rescue.map
```

## Resuming an Interrupted Recovery

If the failing drive crashes mid-recovery, simply re-run the same command. ddrescue reads the mapfile and resumes from where it left off:

```bash
# Resume interrupted recovery - same command, same mapfile
sudo ddrescue -d -f -r3 /dev/sdb /mnt/backup/disk.img /mnt/backup/rescue.map
```

This is why the mapfile path should be on a separate healthy drive, not on the source.

## Recovering a Partition Instead of the Whole Drive

If only one partition is failing:

```bash
# Recover a specific partition (sdb1)
sudo ddrescue -f -n /dev/sdb1 /mnt/backup/partition1.img /mnt/backup/part1.map

# Second pass
sudo ddrescue -d -f -r3 /dev/sdb1 /mnt/backup/partition1.img /mnt/backup/part1.map
```

## Advanced Recovery Strategies

### Reading the Drive in Reverse

Some physical defects (scratches, head alignment issues) respond better to reading in a different order. Try reverse mode after standard passes fail:

```bash
# Read from end to beginning (reverses read direction)
sudo ddrescue -f -R /dev/sdb /mnt/backup/disk.img /mnt/backup/rescue.map
```

### Scraping Mode

Scraping reads in very small chunks around bad sectors to squeeze out maximum data:

```bash
# Enable scraping (more time-consuming but thorough)
sudo ddrescue -f -r1 --no-split /dev/sdb /mnt/backup/disk.img /mnt/backup/rescue.map
```

### Multiple Drive Reads with the Same Mapfile

If you have two identical failing drives (same model, similar failure pattern), you can cross-recover. Use the mapfile from one drive to fill gaps from the other:

```bash
# Drive A recovery
sudo ddrescue -f -n /dev/sdb /mnt/backup/disk.img /mnt/backup/rescue.map

# Attempt to fill gaps using Drive B (same model, different copy)
sudo ddrescue -f -n /dev/sdc /mnt/backup/disk.img /mnt/backup/rescue.map
```

### Cloning Directly to Another Drive

For speed, clone drive to drive instead of to an image file:

```bash
# Clone directly from failing /dev/sdb to healthy /dev/sdc
# WARNING: /dev/sdc must be equal or larger in size
sudo ddrescue -f -n /dev/sdb /dev/sdc /mnt/backup/rescue.map
sudo ddrescue -d -f -r3 /dev/sdb /dev/sdc /mnt/backup/rescue.map
```

## Monitoring Drive Temperature During Recovery

Long recovery sessions stress failing drives. Monitor temperature:

```bash
# Watch drive temperature in real time (install smartmontools first)
watch -n 10 "sudo smartctl -A /dev/sdb | grep Temperature"

# If temperature exceeds 55C, pause and let the drive cool
```

## Verifying the Image After Recovery

Once ddrescue finishes:

```bash
# Check the mapfile to see what was recovered
cat /mnt/backup/rescue.map

# Lines starting with 0x and ending in + are recovered sectors
# Lines ending in - are unrecovered
grep -c "^0x.*-$" /mnt/backup/rescue.map  # Count unrecovered areas

# Try to mount the image and verify filesystem
sudo losetup /dev/loop0 /mnt/backup/disk.img
sudo partprobe /dev/loop0
lsblk /dev/loop0

# Mount read-only to check contents
sudo mount -o ro /dev/loop0p1 /mnt/check_data
ls /mnt/check_data/
```

## Working with the Recovered Image

After getting as much data as possible, work on the image copy - never the source:

```bash
# Run filesystem check on the image partition
sudo fsck.ext4 -y /dev/loop0p1

# Use TestDisk to repair partition table
sudo testdisk /mnt/backup/disk.img

# Use PhotoRec for file carving if filesystem is too damaged
sudo photorec /mnt/backup/disk.img
```

## Interpreting the Mapfile Format

The mapfile is plain text and human-readable:

```text
# Mapfile. Created by GNU ddrescue version 1.25
# Command line: ddrescue -f -n /dev/sdb disk.img rescue.map
# Start time:   2026-03-02 10:00:00
# Current time: 2026-03-02 12:30:00
# Finished
# current_pos  current_status  current_pass
0x12345678  +  1
#      pos        size  status
0x00000000  0x12345678  +   # Recovered region
0x12345678  0x00001000  -   # Bad region (unrecovered)
0x12346678  0x1DCBA988  +   # Recovered region
```

Understanding this output tells you exactly how much data is at risk and where the bad areas are on the disk.

ddrescue is the correct first step for any serious data recovery attempt. Pair it with TestDisk or PhotoRec for filesystem-level recovery after imaging, and you have a complete toolkit for most non-physical failure scenarios.

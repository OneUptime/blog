# How to Set Up Btrfs on Ubuntu for Data Integrity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Btrfs, Storage, Linux, File System

Description: Set up Btrfs on Ubuntu for built-in data integrity checking, RAID support, snapshots, and compression, covering installation, formatting, and initial configuration.

---

Btrfs (B-tree filesystem) is a modern copy-on-write filesystem built into the Linux kernel. Like ZFS, it provides data integrity verification through checksumming, built-in RAID support, snapshots, and transparent compression. Unlike ZFS, Btrfs is part of the mainline Linux kernel and requires no additional modules on Ubuntu.

Ubuntu has supported Btrfs for years, and newer Ubuntu releases (20.04+) have good Btrfs support. The filesystem is mature enough for production use on most workloads, with certain features (like RAID 5/6) being less battle-tested than others.

## Btrfs Key Features

- **Checksumming**: Every block has a checksum; reads are verified automatically
- **Copy-on-write (CoW)**: Modifications write new data rather than overwriting existing blocks
- **Snapshots**: Instant, space-efficient point-in-time copies using CoW
- **Built-in RAID**: RAID 0, 1, 10, and (with caveats) 5/6
- **Compression**: Transparent LZO, ZLIB, or ZSTD compression
- **Subvolumes**: Flexible namespace organization within a filesystem
- **Online resize**: Grow or shrink while mounted
- **Self-healing**: Automatic repair when redundancy is available

## Installing Btrfs Tools

The Btrfs kernel module is included with Ubuntu's kernel. You need the userspace tools:

```bash
sudo apt update
sudo apt install btrfs-progs
```

Verify installation:

```bash
sudo mkfs.btrfs --version
btrfs --version
```

## Creating a Btrfs Filesystem

### Single disk

```bash
# Format a disk with Btrfs
sudo mkfs.btrfs /dev/sdb

# With a label
sudo mkfs.btrfs -L "data_storage" /dev/sdb
```

### RAID 1 (mirror) across two disks

```bash
# Both data and metadata mirrored
sudo mkfs.btrfs -d raid1 -m raid1 /dev/sdb /dev/sdc
```

Flags:
- `-d raid1` - data RAID level (raid0, raid1, raid10, raid5, raid6, single)
- `-m raid1` - metadata RAID level (raid1 is strongly recommended for metadata)

### RAID 10 across four disks

```bash
sudo mkfs.btrfs -d raid10 -m raid10 /dev/sdb /dev/sdc /dev/sdd /dev/sde
```

### Multiple disks as a single filesystem (JBOD-like, no redundancy)

```bash
# Stripe data across disks, mirror metadata
sudo mkfs.btrfs -d raid0 -m raid1 /dev/sdb /dev/sdc
```

## Mounting a Btrfs Filesystem

```bash
# Create mount point
sudo mkdir -p /data

# Mount with good defaults for data integrity
sudo mount -o compress=zstd,autodefrag /dev/sdb /data

# Verify mount
df -h /data
mount | grep btrfs
```

### Common mount options

```bash
# Recommended options for most workloads
sudo mount -o compress=zstd:3,autodefrag,noatime /dev/sdb /data
```

Mount options:
- `compress=zstd` - enable ZSTD compression
- `compress=zstd:3` - ZSTD level 3 (balance between speed and ratio)
- `autodefrag` - automatic defragmentation for small random writes
- `noatime` - don't update access times (performance)
- `discard=async` - enable async TRIM for SSDs
- `space_cache=v2` - improved free space cache (default in newer kernels)

## Making Mounts Persistent

Get the filesystem UUID:

```bash
sudo blkid /dev/sdb
```

Add to `/etc/fstab`:

```bash
sudo nano /etc/fstab
```

```
# Btrfs data volume
UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  /data  btrfs  compress=zstd:3,autodefrag,noatime  0  0
```

Note: Use `0 0` for the dump and fsck fields (Btrfs does its own integrity checking; fsck should not run on Btrfs at boot).

Test the fstab entry:

```bash
sudo mount -a
df -h /data
```

## Verifying Data Integrity Features

### Check that checksumming is active

```bash
sudo btrfs filesystem show /data
```

```
Label: 'data_storage'  uuid: xxxxxxxx-...
        Total devices 1 FS bytes used 1.23 GiB
        devid    1 size 500.00 GiB used 2.01 GiB path /dev/sdb
```

Checksumming is always on in Btrfs - it cannot be disabled.

### Run a scrub to verify existing data

```bash
# Start a scrub (reads all data, verifies checksums)
sudo btrfs scrub start /data

# Check scrub status
sudo btrfs scrub status /data
```

```
UUID:             xxxxxxxx-...
Scrub started:    Mon Mar  2 02:00:01 2026
Status:           running
Duration:         0:02:34
Total to scrub:   1.23 GiB
Rate:             8.12 MiB/s
Bytes scrubbed:   1.23 GiB  /  1.23 GiB
Error summary:    no errors found
```

### Schedule automatic scrubs

```bash
sudo systemctl enable --now btrfs-scrub@-.timer  # Root filesystem
sudo systemctl enable --now btrfs-scrub@data.timer  # /data mount point
```

Or create a custom timer:

```bash
# Weekly scrub via cron
echo "0 2 * * 0 root btrfs scrub start /data" | sudo tee /etc/cron.d/btrfs-scrub
```

## Enabling Compression

Compression can be set at mount time (applies to new writes) or forced on existing files:

### Per-mount compression

```bash
# Already set in fstab entry above
# Mount with: compress=zstd:3
```

### Compress existing data

```bash
# Force-compress existing files
sudo btrfs filesystem defragment -r -v -czstd /data
```

This rewrites files to apply compression. For large datasets this takes significant time.

### Check compression stats

```bash
sudo compsize /data
```

`compsize` shows the effective compression ratio for files in the filesystem. Install if needed:

```bash
sudo apt install btrfs-compsize
```

```
Processed 15432 files, 21345 regular extents (21345 refs), 0 inline.
Type       Perc     Disk Usage   Uncompressed Referenced
TOTAL       62%      786M         1.23G        1.23G
none       100%      234M          234M         234M
zstd        48%      551M         999M         999M
```

## RAID and Device Management

### Check multi-device filesystem status

```bash
sudo btrfs filesystem df /data
```

```
Data, RAID1: total=30.00GiB, used=28.12GiB
System, RAID1: total=32.00MiB, used=16.00KiB
Metadata, RAID1: total=1.00GiB, used=756.57MiB
GlobalReserve, single: total=512.00MiB, used=0.00B
```

### Add a device to an existing Btrfs filesystem

```bash
# Add /dev/sdc to the filesystem mounted at /data
sudo btrfs device add /dev/sdc /data

# Rebalance to distribute data across both devices
sudo btrfs balance start /data
```

### Remove a device

```bash
# Remove /dev/sdb (data rebalances to remaining devices first)
sudo btrfs device remove /dev/sdb /data
```

## Checking Filesystem Health

### General filesystem info

```bash
sudo btrfs filesystem usage /data
```

```
Overall:
    Device size:                  500.00GiB
    Device allocated:              60.05GiB
    Device unallocated:           439.95GiB
    Device missing:                  0.00B
    Used:                          29.05GiB
    Free (estimated):             455.02GiB      (min: 455.02GiB)
    Free (statfs, df):            439.95GiB
    Data ratio:                       1.00
    Metadata ratio:                   2.00
    Global reserve:              512.00MiB      (used: 0.00B)
    Multiple profiles:                  no
```

### Check for filesystem errors

```bash
sudo dmesg | grep -i btrfs
sudo journalctl | grep -i btrfs | tail -20
```

### Run full filesystem check (offline only)

```bash
# Must be unmounted
sudo umount /data
sudo btrfs check /dev/sdb

# Check with a repair attempt (use with caution)
sudo btrfs check --repair /dev/sdb
```

For Btrfs, `btrfs check` should not be run routinely - use scrub for regular integrity verification. Only run `btrfs check` when you suspect filesystem corruption.

## Monitoring Space Usage

Btrfs has a quirk where `df` may show available space differently from what Btrfs internally reports:

```bash
# Use btrfs tools for accurate usage
sudo btrfs filesystem usage /data

# Standard df (can underreport free space)
df -h /data
```

If `df` shows the filesystem as full but Btrfs reports free space:

```bash
# Balance data to make space available
sudo btrfs balance start -dusage=50 /data
```

## Btrfs RAID Caveats

### RAID 5 and RAID 6 - stability note

Btrfs RAID 5 and 6 have known reliability issues with recovery after power failure or crash. As of 2026, these modes work but have a lower safety margin than RAID 1 or RAID 10. For production data, stick with RAID 1 or RAID 10.

### Metadata redundancy

Always keep metadata at RAID 1 regardless of data RAID level:

```bash
# Even for a single-disk setup, keep metadata replicated
# (the kernel does this automatically for multi-device setups)
sudo btrfs balance start -mconvert=raid1 /data
```

## Btrfs vs ZFS on Ubuntu

Both are solid choices for data integrity. Key differences:

- **Btrfs** is part of the mainline kernel (no extra modules), simpler to set up, slightly less feature-complete
- **ZFS** has more mature RAID implementation, better RAID 5/6 equivalents (RAIDZ2), stronger track record for large production storage

For a single server with 2-4 disks and moderate requirements, Btrfs RAID 1 is an excellent, kernel-native solution. For larger storage systems or where data integrity is paramount, ZFS is generally preferred.

Btrfs setup is straightforward on Ubuntu, and with scrubbing configured and RAID 1 for redundancy, it provides excellent data integrity guarantees for most workloads.

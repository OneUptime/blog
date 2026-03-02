# How to Install Ubuntu Server with Btrfs as the Root File System

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Btrfs, Filesystem, Storage

Description: How to install Ubuntu Server using Btrfs as the root filesystem, configure subvolumes for efficient snapshots, and use Btrfs-specific features for system management.

---

Btrfs (B-tree filesystem) offers capabilities that ext4 does not: copy-on-write semantics, transparent compression, built-in RAID, and efficient snapshots. Using it as the root filesystem on Ubuntu Server enables system-level snapshotting before package updates and rollback capability if something goes wrong.

## Why Btrfs for the Root Filesystem

The main practical advantages over ext4 for server use:

- **Snapshots**: Instant filesystem snapshots that consume no extra space until data diverges
- **Subvolumes**: Logical filesystem subdivisions that can be snapshotted independently
- **Transparent compression**: Reduce disk usage and potentially improve I/O performance for compressible data
- **Checksumming**: Per-block checksums catch silent data corruption (bit rot)
- **Send/receive**: Efficient incremental backup via btrfs send/receive

The downsides are real too: Btrfs RAID 5/6 has historically had reliability issues (though this is largely resolved in recent kernels), and performance characteristics differ from ext4 in ways that matter for some workloads, particularly random writes with fragmentation.

## Installing Ubuntu Server with Btrfs

The Ubuntu Server installer (Subiquity) supports Btrfs for the root filesystem through the custom storage layout option.

### In the Subiquity Installer

At the storage configuration step:

1. Select "Custom storage layout"
2. Create the EFI partition (1GB, FAT32, mounted at `/boot/efi`)
3. Create the boot partition (2GB, ext4, mounted at `/boot`) - keep `/boot` as ext4 because GRUB's Btrfs support is limited
4. Create the root partition using the remaining space, formatted as Btrfs

When formatting the root partition as Btrfs, the installer will set up subvolumes. Ubuntu typically creates:
- `@` - mounted at `/`
- `@home` - mounted at `/home`

This subvolume layout is important because it allows snapshotting `/` without including `/home` in the snapshot (and vice versa).

## Manual Btrfs Setup

If doing a post-install reconfiguration or setting up a secondary disk:

```bash
# Format a partition as Btrfs
sudo mkfs.btrfs -L ubuntu-root /dev/sdb1

# Mount it
sudo mount /dev/sdb1 /mnt

# Create subvolumes
sudo btrfs subvolume create /mnt/@
sudo btrfs subvolume create /mnt/@home
sudo btrfs subvolume create /mnt/@snapshots
sudo btrfs subvolume create /mnt/@var-log

# Unmount and remount using subvolumes
sudo umount /mnt

# Mount root subvolume
sudo mount -o defaults,subvol=@ /dev/sdb1 /mnt

# Create mount points for other subvolumes
sudo mkdir -p /mnt/home /mnt/.snapshots /mnt/var/log

# Mount other subvolumes
sudo mount -o defaults,subvol=@home /dev/sdb1 /mnt/home
sudo mount -o defaults,subvol=@snapshots /dev/sdb1 /mnt/.snapshots
sudo mount -o defaults,subvol=@var-log /dev/sdb1 /mnt/var/log
```

## Configuring fstab for Btrfs

The fstab entries for a Btrfs setup with subvolumes look like this:

```bash
# Get the UUID of the Btrfs partition
blkid /dev/sdb1
```

```
# /etc/fstab
# Btrfs root - using subvolumes with compression and SSD optimizations
UUID=your-btrfs-uuid  /            btrfs  defaults,subvol=@,compress=zstd:1,noatime,ssd   0  0
UUID=your-btrfs-uuid  /home        btrfs  defaults,subvol=@home,compress=zstd:1,noatime,ssd  0  0
UUID=your-btrfs-uuid  /.snapshots  btrfs  defaults,subvol=@snapshots,noatime,ssd          0  0
UUID=your-btrfs-uuid  /var/log     btrfs  defaults,subvol=@var-log,noatime,ssd            0  0

# Traditional partitions
UUID=efi-uuid          /boot/efi    vfat   umask=0077                                     0  1
UUID=boot-uuid         /boot        ext4   defaults                                        0  2
```

Notable mount options:
- `compress=zstd:1` - Enable Zstandard compression at level 1 (good balance of speed vs ratio)
- `noatime` - Do not update access times on read, reduces write amplification
- `ssd` - Enable SSD-specific optimizations

## Taking Snapshots

Btrfs snapshots are instant and space-efficient:

```bash
# Create a read-only snapshot of root before a system update
sudo btrfs subvolume snapshot -r / /.snapshots/root-$(date +%Y%m%d-%H%M%S)

# List existing snapshots
sudo btrfs subvolume list /

# Show snapshot details
sudo btrfs subvolume show /.snapshots/root-20240315-143022
```

### Automating Snapshots with snapper

Snapper is a tool for managing Btrfs snapshots automatically:

```bash
sudo apt install snapper

# Create a snapper configuration for root
sudo snapper -c root create-config /

# Create a configuration for home
sudo snapper -c home create-config /home

# Edit the root configuration
sudo nano /etc/snapper/configs/root
```

Key snapper settings:

```bash
# In /etc/snapper/configs/root

# Keep hourly snapshots for 24 hours
TIMELINE_LIMIT_HOURLY="24"

# Keep daily snapshots for 7 days
TIMELINE_LIMIT_DAILY="7"

# Keep weekly snapshots for 4 weeks
TIMELINE_LIMIT_WEEKLY="4"

# Keep monthly snapshots for 12 months
TIMELINE_LIMIT_MONTHLY="12"
```

Enable the snapper timers:

```bash
sudo systemctl enable --now snapper-timeline.timer
sudo systemctl enable --now snapper-cleanup.timer
```

## Enabling Transparent Compression

If you did not set compression at mount time, enable it retroactively:

```bash
# Enable compression for the root subvolume (future writes only)
sudo btrfs property set / compression zstd

# Recompress existing files (processes all data)
sudo btrfs filesystem defragment -r -czstd /
```

Check how much compression is saving:

```bash
sudo compsize /
# Shows: uncompressed size, compressed size, ratio
```

## Checking Filesystem Health

```bash
# Check filesystem statistics
sudo btrfs filesystem df /
sudo btrfs filesystem show /

# Run a scrub to verify checksums against disk data
sudo btrfs scrub start /

# Check scrub status
sudo btrfs scrub status /

# View any detected errors
sudo btrfs device stats /
```

Schedule regular scrubs:

```bash
# Enable the built-in scrub timer (runs monthly)
sudo systemctl enable --now btrfs-scrub@-.timer

# Or add a cron job for more control
echo "0 3 1 * * root btrfs scrub start /" | sudo tee /etc/cron.d/btrfs-scrub
```

## Rolling Back from a Snapshot

If an update breaks something, rolling back involves making an old snapshot the active subvolume. This requires booting from external media or a working backup:

```bash
# From a live USB, mount the Btrfs partition
sudo mount /dev/sda3 /mnt

# List subvolumes
sudo btrfs subvolume list /mnt

# Move the broken root aside
sudo mv /mnt/@ /mnt/@-broken

# Make the snapshot the new root (rename it to @)
sudo mv /mnt/.snapshots/root-20240315-143022 /mnt/@

# Reboot into the restored system
sudo reboot
```

Some setups use GRUB boot entries that specify the subvol parameter, allowing recovery from the boot menu directly without needing a live USB.

## Btrfs RAID for Multiple Disks

If you have multiple disks, Btrfs can mirror or stripe across them:

```bash
# Create a RAID-1 (mirrored) Btrfs filesystem across two disks
sudo mkfs.btrfs -m raid1 -d raid1 /dev/sdb /dev/sdc

# Add a disk to an existing Btrfs filesystem
sudo btrfs device add /dev/sdd /

# Balance data across all devices after adding
sudo btrfs balance start /
```

Note: Stick to RAID-1 for Btrfs. RAID-5 and RAID-6 in Btrfs have historically had bugs and are not recommended for production.

## Performance Tuning

```bash
# Check current Btrfs options
mount | grep btrfs

# Defragment a heavily fragmented subvolume
sudo btrfs filesystem defragment -r /

# Show fragmentation statistics
sudo btrfs filesystem defragment -r -v --dryrun / 2>&1 | tail -5

# Monitor I/O
sudo btrfs device stats /
```

For database servers with heavy random write patterns, Btrfs copy-on-write can cause performance issues due to fragmentation. Consider placing database files on a separate ext4 or XFS partition, or disabling copy-on-write for specific directories:

```bash
# Disable copy-on-write for a directory (for databases)
sudo chattr +C /var/lib/postgresql
```

Btrfs is a solid choice for Ubuntu Server when you want snapshotting capability and data integrity checksumming. The learning curve is steeper than ext4, but the operational benefits make it worthwhile for systems that need reliable rollback capability.

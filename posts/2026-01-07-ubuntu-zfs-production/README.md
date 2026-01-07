# How to Configure ZFS on Ubuntu for Production Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, ZFS, Storage, High Availability

Description: Configure ZFS on Ubuntu for production storage with pools, datasets, snapshots, scrubbing, and data integrity features.

---

## Introduction

ZFS (Zettabyte File System) is an advanced filesystem originally developed by Sun Microsystems that combines the roles of a filesystem and volume manager. It provides enterprise-grade features including data integrity verification, automatic repair, snapshots, clones, and built-in RAID functionality. For production environments requiring reliable storage, ZFS offers unmatched data protection capabilities.

In this comprehensive guide, we will walk through configuring ZFS on Ubuntu for production storage, covering everything from basic pool creation to advanced performance tuning.

## Why ZFS for Production Storage?

Before diving into configuration, let us understand why ZFS is an excellent choice for production environments:

- **Data Integrity**: ZFS uses checksums to detect and correct silent data corruption
- **Copy-on-Write**: Ensures data consistency even during power failures
- **Snapshots**: Create instant, space-efficient point-in-time copies
- **Built-in RAID**: Eliminates the need for hardware RAID controllers
- **Compression**: Transparent data compression saves storage space
- **Scalability**: Supports pools up to 256 zettabytes

## Prerequisites

Before starting, ensure you have:

- Ubuntu 20.04 LTS or later (22.04 or 24.04 recommended)
- Root or sudo access
- At least two disks for redundant configurations
- Minimum 8GB RAM (16GB+ recommended for production)

## Installing ZFS on Ubuntu

Ubuntu includes native ZFS support. Let us install the necessary packages.

### Update the system and install ZFS utilities
```bash
# Update package lists
sudo apt update

# Install ZFS utilities and kernel modules
sudo apt install -y zfsutils-linux

# Verify the installation
zfs --version
```

### Load the ZFS kernel module
```bash
# Load the ZFS module into the kernel
sudo modprobe zfs

# Verify the module is loaded
lsmod | grep zfs
```

### Enable ZFS services to start on boot
```bash
# Enable ZFS import and mount services
sudo systemctl enable zfs-import-cache
sudo systemctl enable zfs-import-scan
sudo systemctl enable zfs-mount
sudo systemctl enable zfs-share

# Start the services
sudo systemctl start zfs-import-cache
sudo systemctl start zfs-mount
```

## Understanding ZFS Architecture

ZFS uses a hierarchical structure:

1. **vdevs (Virtual Devices)**: Groups of physical disks
2. **zpools**: Collections of vdevs forming a storage pool
3. **Datasets**: Filesystems created within pools
4. **Volumes (zvols)**: Block devices within pools

## Identifying Available Disks

Before creating pools, identify your available disks.

### List all block devices
```bash
# Display all available disks and partitions
lsblk -d -o NAME,SIZE,TYPE,MODEL

# Alternative: use fdisk to list disks
sudo fdisk -l | grep "Disk /dev"
```

### Get detailed disk information including serial numbers
```bash
# List disks with their unique identifiers (recommended for production)
ls -la /dev/disk/by-id/

# Get disk serial numbers
sudo lshw -class disk -short
```

Using disk-by-id paths is recommended for production as they remain consistent across reboots.

## Creating ZFS Pools (zpools)

zpools are the foundation of ZFS storage. Let us explore different pool configurations.

### Creating a Simple Single-Disk Pool (Not for Production)
```bash
# Create a basic pool using a single disk (no redundancy)
# WARNING: Only use for testing, not production
sudo zpool create testpool /dev/sdb

# Verify the pool was created
sudo zpool list
sudo zpool status testpool
```

### Creating a Mirrored Pool (RAID-1 Equivalent)
```bash
# Create a mirrored pool with two disks
# Data is written to both disks simultaneously
# Can survive one disk failure
sudo zpool create -f datapool mirror /dev/disk/by-id/ata-DISK1 /dev/disk/by-id/ata-DISK2

# Verify the mirror configuration
sudo zpool status datapool
```

### Creating a RAIDZ1 Pool (RAID-5 Equivalent)
```bash
# Create a RAIDZ1 pool with three disks
# Provides one disk of parity protection
# Can survive one disk failure
sudo zpool create -f storagepool raidz1 \
    /dev/disk/by-id/ata-DISK1 \
    /dev/disk/by-id/ata-DISK2 \
    /dev/disk/by-id/ata-DISK3

# Check pool status
sudo zpool status storagepool
```

### Creating a RAIDZ2 Pool (RAID-6 Equivalent)
```bash
# Create a RAIDZ2 pool with four disks
# Provides two disks of parity protection
# Can survive two simultaneous disk failures
# Recommended for production with larger disk counts
sudo zpool create -f prodpool raidz2 \
    /dev/disk/by-id/ata-DISK1 \
    /dev/disk/by-id/ata-DISK2 \
    /dev/disk/by-id/ata-DISK3 \
    /dev/disk/by-id/ata-DISK4

# Verify configuration
sudo zpool status prodpool
```

### Creating a RAIDZ3 Pool (Triple Parity)
```bash
# Create a RAIDZ3 pool with five or more disks
# Provides three disks of parity protection
# Can survive three simultaneous disk failures
# Best for large pools with many disks
sudo zpool create -f archivepool raidz3 \
    /dev/disk/by-id/ata-DISK1 \
    /dev/disk/by-id/ata-DISK2 \
    /dev/disk/by-id/ata-DISK3 \
    /dev/disk/by-id/ata-DISK4 \
    /dev/disk/by-id/ata-DISK5

# Check the pool configuration
sudo zpool status archivepool
```

### Creating a Pool with Multiple vdevs
```bash
# Create a pool with multiple RAIDZ1 vdevs for better performance
# Each vdev is a separate RAIDZ1 group
# Pool can survive one disk failure per vdev
sudo zpool create -f fastpool \
    raidz1 /dev/disk/by-id/ata-DISK1 /dev/disk/by-id/ata-DISK2 /dev/disk/by-id/ata-DISK3 \
    raidz1 /dev/disk/by-id/ata-DISK4 /dev/disk/by-id/ata-DISK5 /dev/disk/by-id/ata-DISK6

# View the pool structure
sudo zpool status fastpool
```

### Adding a Separate Intent Log (SLOG) Device
```bash
# Add a fast SSD as a separate intent log for better sync write performance
# This is crucial for database workloads
sudo zpool add datapool log mirror \
    /dev/disk/by-id/nvme-SSD1 \
    /dev/disk/by-id/nvme-SSD2

# Verify the log device was added
sudo zpool status datapool
```

### Adding a Cache Device (L2ARC)
```bash
# Add an SSD as a read cache (L2ARC) for frequently accessed data
# Improves read performance for working sets larger than RAM
sudo zpool add datapool cache /dev/disk/by-id/nvme-CACHE_SSD

# Verify the cache device
sudo zpool status datapool
```

### Adding Hot Spare Disks
```bash
# Add hot spare disks for automatic failover
# ZFS will automatically replace a failed disk with a spare
sudo zpool add datapool spare \
    /dev/disk/by-id/ata-SPARE1 \
    /dev/disk/by-id/ata-SPARE2

# Verify spares are configured
sudo zpool status datapool
```

## Managing ZFS Datasets

Datasets are filesystems within a zpool. They provide flexible storage organization.

### Creating Basic Datasets
```bash
# Create a dataset for general data storage
sudo zfs create datapool/data

# Create a nested dataset structure
sudo zfs create datapool/data/documents
sudo zfs create datapool/data/media
sudo zfs create datapool/data/backups

# List all datasets
sudo zfs list
```

### Creating Datasets with Custom Mount Points
```bash
# Create a dataset with a specific mount point
sudo zfs create -o mountpoint=/srv/database datapool/database

# Create a dataset that does not mount automatically
sudo zfs create -o mountpoint=none datapool/templates

# Verify mount points
sudo zfs get mountpoint datapool/database
```

### Setting Dataset Quotas and Reservations
```bash
# Set a quota to limit maximum space usage
# This dataset cannot exceed 100GB
sudo zfs set quota=100G datapool/data/documents

# Set a reservation to guarantee minimum space
# This ensures 50GB is always available for this dataset
sudo zfs set reservation=50G datapool/database

# Set both quota and reservation
sudo zfs set quota=200G datapool/data/media
sudo zfs set reservation=100G datapool/data/media

# Verify quota and reservation settings
sudo zfs get quota,reservation datapool/data/documents datapool/database
```

### Configuring Dataset Properties
```bash
# Set the record size (block size) for database workloads
# Smaller record sizes are better for random I/O
sudo zfs set recordsize=16K datapool/database

# Set the record size for large file workloads
# Larger record sizes are better for sequential I/O
sudo zfs set recordsize=1M datapool/data/media

# Disable access time updates for better performance
sudo zfs set atime=off datapool/data

# Enable extended attributes and POSIX ACLs
sudo zfs set xattr=sa datapool/data
sudo zfs set acltype=posixacl datapool/data

# View all properties of a dataset
sudo zfs get all datapool/database | head -30
```

## Compression Configuration

ZFS supports transparent compression that can save significant storage space.

### Enabling LZ4 Compression (Recommended Default)
```bash
# Enable LZ4 compression (fast, good compression ratio)
# LZ4 is the recommended default for most workloads
sudo zfs set compression=lz4 datapool

# Verify compression is enabled
sudo zfs get compression datapool
```

### Using ZSTD Compression for Better Ratios
```bash
# Enable ZSTD compression for better compression ratios
# ZSTD offers better compression than LZ4 but uses more CPU
sudo zfs set compression=zstd datapool/data/backups

# Use a specific ZSTD compression level (1-19)
# Higher levels = better compression, more CPU usage
sudo zfs set compression=zstd-6 datapool/data/archives

# View compression statistics
sudo zfs get compressratio datapool/data/backups
```

### Compression Comparison for Different Workloads
```bash
# For high-speed workloads, use LZ4 (minimal CPU overhead)
sudo zfs set compression=lz4 datapool/database

# For archival data, use ZSTD with higher compression
sudo zfs set compression=zstd-9 datapool/data/archives

# For incompressible data (already compressed files), disable compression
sudo zfs set compression=off datapool/data/media/compressed

# Check compression ratio across all datasets
sudo zfs get compressratio -r datapool
```

## Deduplication Configuration

Deduplication can save space when storing duplicate data, but has significant RAM requirements.

### Understanding Deduplication Requirements
```bash
# Deduplication requires approximately 5GB of RAM per 1TB of data
# Check current memory usage
free -h

# Estimate deduplication table (DDT) size
# Each entry requires about 320 bytes
sudo zdb -S datapool
```

### Enabling Deduplication (Use with Caution)
```bash
# Enable deduplication on a dataset
# WARNING: Ensure you have sufficient RAM (5GB per 1TB of deduplicated data)
sudo zfs set dedup=on datapool/data/backups

# Verify deduplication is enabled
sudo zfs get dedup datapool/data/backups

# Check deduplication statistics
sudo zpool get dedupratio datapool
```

### Checking Deduplication Effectiveness
```bash
# View detailed deduplication statistics
sudo zpool status -D datapool

# Check DDT size in memory
sudo zdb -DD datapool

# View deduplication ratio
sudo zfs get dedupratio datapool/data/backups
```

**Note**: For most production environments, compression is preferred over deduplication due to lower RAM requirements and predictable performance.

## ZFS Snapshots

Snapshots are one of ZFS's most powerful features, providing instant point-in-time copies.

### Creating Snapshots
```bash
# Create a snapshot with a descriptive name
sudo zfs snapshot datapool/data@daily-2026-01-07

# Create a snapshot with timestamp
sudo zfs snapshot datapool/database@$(date +%Y%m%d-%H%M%S)

# Create recursive snapshots of all child datasets
sudo zfs snapshot -r datapool/data@weekly-backup

# List all snapshots
sudo zfs list -t snapshot
```

### Viewing Snapshot Contents
```bash
# Access snapshot data through the hidden .zfs directory
ls /datapool/data/.zfs/snapshot/daily-2026-01-07/

# Compare snapshot to current data
diff -r /datapool/data/.zfs/snapshot/daily-2026-01-07/ /datapool/data/

# Check snapshot size (space consumed)
sudo zfs list -t snapshot -o name,used,referenced
```

### Rolling Back to a Snapshot
```bash
# Rollback to a previous snapshot
# WARNING: This destroys all changes made after the snapshot
sudo zfs rollback datapool/data@daily-2026-01-07

# Force rollback to an earlier snapshot (destroys intermediate snapshots)
sudo zfs rollback -r datapool/data@weekly-backup
```

### Deleting Snapshots
```bash
# Delete a single snapshot
sudo zfs destroy datapool/data@old-snapshot

# Delete multiple snapshots matching a pattern
sudo zfs destroy datapool/data@daily-2026-01-%

# Delete all snapshots older than a specific one
sudo zfs destroy datapool/data@first%last

# Dry run to see what would be deleted
sudo zfs destroy -n -v datapool/data@test-snapshot
```

### Automated Snapshot Management with Sanoid
```bash
# Install Sanoid for automated snapshot management
sudo apt install -y sanoid

# Create Sanoid configuration
sudo mkdir -p /etc/sanoid
sudo tee /etc/sanoid/sanoid.conf << 'EOF'
[datapool/data]
    use_template = production
    recursive = yes

[template_production]
    # Keep 24 hourly snapshots
    hourly = 24
    # Keep 7 daily snapshots
    daily = 7
    # Keep 4 weekly snapshots
    weekly = 4
    # Keep 12 monthly snapshots
    monthly = 12
    # Automatically prune old snapshots
    autosnap = yes
    autoprune = yes
EOF

# Enable and start Sanoid timer
sudo systemctl enable sanoid.timer
sudo systemctl start sanoid.timer

# Manually run Sanoid
sudo sanoid --take-snapshots --prune-snapshots
```

## Sending and Receiving Snapshots

ZFS can efficiently replicate data between pools or systems using send/receive.

### Local Snapshot Replication
```bash
# Send a snapshot to another pool
sudo zfs send datapool/data@daily-2026-01-07 | sudo zfs receive backuppool/data

# Send incremental changes between snapshots
sudo zfs send -i datapool/data@daily-2026-01-06 datapool/data@daily-2026-01-07 | \
    sudo zfs receive backuppool/data

# Send with compression for faster transfer
sudo zfs send datapool/data@daily-2026-01-07 | gzip | \
    sudo zfs receive backuppool/data
```

### Remote Snapshot Replication
```bash
# Send snapshot to a remote server over SSH
sudo zfs send datapool/data@daily-2026-01-07 | \
    ssh user@backup-server "sudo zfs receive backuppool/data"

# Send incremental snapshot to remote server
sudo zfs send -i @daily-2026-01-06 datapool/data@daily-2026-01-07 | \
    ssh user@backup-server "sudo zfs receive backuppool/data"

# Use compression and progress monitoring
sudo zfs send datapool/data@daily-2026-01-07 | \
    pv | gzip | \
    ssh user@backup-server "gunzip | sudo zfs receive backuppool/data"
```

### Automated Replication with Syncoid
```bash
# Install Syncoid (comes with Sanoid)
sudo apt install -y sanoid

# Replicate a dataset to a local backup pool
sudo syncoid datapool/data backuppool/data

# Replicate to a remote server
sudo syncoid datapool/data user@backup-server:backuppool/data

# Replicate recursively
sudo syncoid -r datapool/data user@backup-server:backuppool/data
```

## Scrubbing and Health Monitoring

Regular scrubbing is essential for maintaining data integrity in production environments.

### Running a Manual Scrub
```bash
# Start a scrub on a pool
sudo zpool scrub datapool

# Check scrub progress
sudo zpool status datapool

# View detailed scrub statistics
sudo zpool status -v datapool
```

### Scheduling Regular Scrubs
```bash
# Create a systemd timer for weekly scrubs
sudo tee /etc/systemd/system/zfs-scrub@.timer << 'EOF'
[Unit]
Description=Weekly ZFS scrub timer for %i

[Timer]
OnCalendar=Sun *-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Create the corresponding service
sudo tee /etc/systemd/system/zfs-scrub@.service << 'EOF'
[Unit]
Description=ZFS scrub for %i

[Service]
Type=oneshot
ExecStart=/sbin/zpool scrub %i
EOF

# Enable the timer for your pool
sudo systemctl enable zfs-scrub@datapool.timer
sudo systemctl start zfs-scrub@datapool.timer

# Verify the timer is active
sudo systemctl list-timers | grep zfs-scrub
```

### Monitoring Pool Health
```bash
# Check overall pool status
sudo zpool status -x

# View detailed pool health
sudo zpool status -v datapool

# Check for errors
sudo zpool status datapool | grep -E "(errors|state)"

# View pool I/O statistics
sudo zpool iostat datapool 5

# View detailed I/O statistics with latency
sudo zpool iostat -l datapool 5
```

### Setting Up Health Alerts
```bash
# Create a ZFS health monitoring script
sudo tee /usr/local/bin/zfs-health-check.sh << 'EOF'
#!/bin/bash
# ZFS Health Check Script

POOLS=$(zpool list -H -o name)
ALERT_EMAIL="admin@example.com"

for POOL in $POOLS; do
    STATUS=$(zpool status -x $POOL)
    if [ "$STATUS" != "pool '$POOL' is healthy" ]; then
        echo "ZFS Pool $POOL requires attention:" | mail -s "ZFS Alert: $POOL" $ALERT_EMAIL
        zpool status -v $POOL | mail -s "ZFS Status: $POOL" $ALERT_EMAIL
    fi
done
EOF

# Make it executable
sudo chmod +x /usr/local/bin/zfs-health-check.sh

# Add to crontab for hourly checks
echo "0 * * * * root /usr/local/bin/zfs-health-check.sh" | sudo tee /etc/cron.d/zfs-health-check
```

### Using ZFS Event Daemon (ZED)
```bash
# ZED is included with ZFS and monitors events
# Configure ZED for email notifications
sudo tee /etc/zfs/zed.d/zed.rc << 'EOF'
# Email address for notifications
ZED_EMAIL_ADDR="admin@example.com"

# Send email on all events
ZED_NOTIFY_INTERVAL_SECS=3600
ZED_NOTIFY_VERBOSE=1

# Enable email notifications
ZED_EMAIL_PROG="mail"
ZED_EMAIL_OPTS="-s '@SUBJECT@' @ADDRESS@"

# Pushbullet notifications (optional)
# ZED_PUSHBULLET_ACCESS_TOKEN=""
# ZED_PUSHBULLET_CHANNEL_TAG=""
EOF

# Enable and start ZED
sudo systemctl enable zfs-zed
sudo systemctl start zfs-zed

# Check ZED status
sudo systemctl status zfs-zed
```

## Performance Tuning

Optimizing ZFS for production workloads requires careful tuning.

### ARC (Adaptive Replacement Cache) Tuning
```bash
# Check current ARC size
cat /proc/spl/kstat/zfs/arcstats | grep -E "^(size|c_max|c_min)"

# Set maximum ARC size (adjust based on available RAM)
# Leave at least 4GB for the operating system
echo "options zfs zfs_arc_max=17179869184" | sudo tee /etc/modprobe.d/zfs.conf

# Set minimum ARC size
echo "options zfs zfs_arc_min=4294967296" | sudo tee -a /etc/modprobe.d/zfs.conf

# Apply changes (requires reboot or module reload)
sudo update-initramfs -u
```

### Tuning for Database Workloads
```bash
# Disable prefetching for random I/O workloads
sudo zfs set primarycache=metadata datapool/database

# Set appropriate record size for databases
sudo zfs set recordsize=16K datapool/database

# Enable synchronous writes for durability
sudo zfs set sync=always datapool/database

# Set log bias to optimize for latency
sudo zfs set logbias=latency datapool/database
```

### Tuning for Large File Workloads
```bash
# Use larger record sizes for sequential I/O
sudo zfs set recordsize=1M datapool/data/media

# Enable prefetching for streaming workloads
sudo zfs set primarycache=all datapool/data/media

# Optimize for throughput
sudo zfs set logbias=throughput datapool/data/media
```

### I/O Scheduler Optimization
```bash
# Check current I/O scheduler for disks
cat /sys/block/sda/queue/scheduler

# Set deadline or none scheduler for SSDs
echo "none" | sudo tee /sys/block/nvme0n1/queue/scheduler

# Make scheduler settings persistent
sudo tee /etc/udev/rules.d/60-schedulers.rules << 'EOF'
# Set scheduler for NVMe devices
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
# Set scheduler for SATA SSDs
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"
# Set scheduler for HDDs
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"
EOF
```

### Tuning ZFS Module Parameters
```bash
# Create comprehensive ZFS tuning configuration
sudo tee /etc/modprobe.d/zfs-tuning.conf << 'EOF'
# Maximum ARC size (16GB)
options zfs zfs_arc_max=17179869184

# Minimum ARC size (4GB)
options zfs zfs_arc_min=4294967296

# Disable ARC shrinking under memory pressure (for dedicated storage servers)
# options zfs zfs_arc_min=zfs_arc_max

# Increase transaction group timeout for better aggregation
options zfs zfs_txg_timeout=30

# Increase dirty data limit for better write aggregation
options zfs zfs_dirty_data_max_percent=25

# Optimize for async writes
options zfs zfs_vdev_async_write_active_max_dirty_percent=70
EOF

# Update initramfs and reboot
sudo update-initramfs -u
```

## Replacing Failed Disks

Knowing how to replace failed disks is critical for production environments.

### Identifying Failed Disks
```bash
# Check for degraded pools
sudo zpool status -x

# View detailed status of all pools
sudo zpool status -v

# Check for disk errors
sudo zpool status datapool | grep -E "(FAULTED|DEGRADED|UNAVAIL)"
```

### Replacing a Disk
```bash
# Replace a failed disk with a new disk
sudo zpool replace datapool /dev/disk/by-id/ata-FAILED_DISK /dev/disk/by-id/ata-NEW_DISK

# Monitor resilver progress
sudo zpool status datapool

# Watch resilver progress in real-time
watch -n 5 'zpool status datapool | grep -A 5 resilver'
```

### Offline and Online Disks
```bash
# Take a disk offline for maintenance
sudo zpool offline datapool /dev/disk/by-id/ata-DISK1

# Bring a disk back online
sudo zpool online datapool /dev/disk/by-id/ata-DISK1

# Clear errors and retry
sudo zpool clear datapool
```

## Importing and Exporting Pools

Moving pools between systems or recovering from issues.

### Exporting a Pool
```bash
# Export a pool (required before moving disks to another system)
sudo zpool export datapool

# Force export if datasets are busy
sudo zpool export -f datapool
```

### Importing a Pool
```bash
# Scan for available pools
sudo zpool import

# Import a specific pool
sudo zpool import datapool

# Import with a different name
sudo zpool import datapool newdatapool

# Import pool from specific directory
sudo zpool import -d /dev/disk/by-id datapool

# Force import a pool that was not cleanly exported
sudo zpool import -f datapool
```

### Importing Pools at Boot
```bash
# List pool cache
cat /etc/zfs/zpool.cache

# Regenerate pool cache
sudo zpool set cachefile=/etc/zfs/zpool.cache datapool

# Ensure import service is enabled
sudo systemctl enable zfs-import-cache
```

## Best Practices for Production

### Pre-Deployment Checklist
```bash
# Verify all disks are healthy before creating pools
for disk in /dev/sd{b,c,d,e,f}; do
    echo "Checking $disk"
    sudo smartctl -H $disk
done

# Ensure ECC RAM is being used (check BIOS/UEFI)
sudo dmidecode -t memory | grep -E "Error Correction Type"

# Verify sufficient RAM
free -h
```

### Recommended Pool Settings
```bash
# Set production-ready pool properties
sudo zfs set atime=off datapool
sudo zfs set compression=lz4 datapool
sudo zfs set xattr=sa datapool
sudo zfs set acltype=posixacl datapool

# Enable autotrim for SSD pools
sudo zpool set autotrim=on datapool
```

### Monitoring Script
```bash
# Create a comprehensive monitoring script
sudo tee /usr/local/bin/zfs-monitor.sh << 'EOF'
#!/bin/bash
# ZFS Monitoring Script

echo "=== ZFS Pool Status ==="
zpool list

echo ""
echo "=== Pool Health ==="
zpool status -x

echo ""
echo "=== Dataset Usage ==="
zfs list -o name,used,avail,refer,compressratio

echo ""
echo "=== ARC Statistics ==="
arc_size=$(cat /proc/spl/kstat/zfs/arcstats | grep "^size" | awk '{print $3}')
arc_hit=$(cat /proc/spl/kstat/zfs/arcstats | grep "^hits" | awk '{print $3}')
arc_miss=$(cat /proc/spl/kstat/zfs/arcstats | grep "^misses" | awk '{print $3}')
echo "ARC Size: $((arc_size / 1024 / 1024 / 1024)) GB"
echo "ARC Hit Ratio: $(echo "scale=2; $arc_hit * 100 / ($arc_hit + $arc_miss)" | bc)%"

echo ""
echo "=== Recent Snapshots ==="
zfs list -t snapshot -o name,creation,used | tail -10
EOF

sudo chmod +x /usr/local/bin/zfs-monitor.sh
```

## Troubleshooting Common Issues

### Pool Will Not Import
```bash
# Check for conflicting pool GUIDs
sudo zpool import -d /dev/disk/by-id

# Force import with new pool name if GUID conflict exists
sudo zpool import -f -o readonly=on datapool recovered_pool

# Clear pool state
sudo zpool clear datapool
```

### High Memory Usage
```bash
# Check ARC size
arc_size=$(cat /proc/spl/kstat/zfs/arcstats | grep "^size" | awk '{print $3}')
echo "Current ARC: $((arc_size / 1024 / 1024 / 1024)) GB"

# Reduce ARC maximum if needed
echo 8589934592 | sudo tee /sys/module/zfs/parameters/zfs_arc_max
```

### Slow Performance
```bash
# Check for fragmentation
sudo zpool status -v datapool

# Check I/O wait
iostat -x 5

# Monitor ZFS I/O
sudo zpool iostat -v datapool 5

# Check for slow disks
sudo zpool iostat -lq datapool 5
```

## Conclusion

ZFS provides enterprise-grade storage capabilities for Ubuntu production environments. By following this guide, you have learned to:

1. Install and configure ZFS on Ubuntu
2. Create various pool configurations (mirror, RAIDZ1/2/3)
3. Manage datasets with quotas, reservations, and properties
4. Configure compression and understand deduplication
5. Create and manage snapshots for data protection
6. Set up replication with send/receive
7. Implement scrubbing and health monitoring
8. Tune ZFS for different workloads
9. Handle disk failures and replacements

For production environments, remember to:
- Use ECC RAM for data integrity
- Schedule regular scrubs (weekly recommended)
- Monitor pool health continuously
- Maintain at least one spare disk per pool
- Regularly test your backup and recovery procedures

ZFS's combination of data integrity, flexibility, and advanced features makes it an excellent choice for production storage on Ubuntu. With proper configuration and monitoring, ZFS can provide reliable, high-performance storage for years to come.

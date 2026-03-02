# How to Balance and Defragment Btrfs Volumes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Btrfs, Storage, File Systems, Performance

Description: Learn how to balance and defragment Btrfs volumes on Ubuntu to optimize storage utilization and maintain file system performance.

---

Btrfs uses a copy-on-write model that, over time, leads to fragmentation and uneven space distribution across devices. Two maintenance operations help address this: balancing and defragmenting. They serve different purposes and it's worth understanding both before running them, especially since they can be resource-intensive on large volumes.

## Understanding Balance vs Defragment

**Balance** redistributes chunks (Btrfs's unit of allocation) across all devices in the pool. It's primarily relevant on multi-device setups or when the allocation ratio between data and metadata is skewed. After adding or removing a device, a balance ensures data is spread evenly.

**Defragment** addresses file-level fragmentation - situations where a file's extents are scattered across the disk. This helps read performance for large sequential files but can break reflinks and snapshot deduplication if done carelessly.

## Installing btrfs-progs

Both operations require `btrfs-progs`:

```bash
sudo apt update
sudo apt install btrfs-progs
```

Verify you have a Btrfs volume mounted:

```bash
df -T | grep btrfs
# or
mount | grep btrfs
```

## Running a Balance

### Basic Balance

A full balance with no filters moves all chunks, which can take hours on large arrays. For most maintenance needs, filtered balancing is more appropriate:

```bash
# Balance data and metadata chunks with usage under 50%
# This targets partially filled chunks, consolidating space
sudo btrfs balance start -dusage=50 -musage=50 /mnt/data
```

The `-dusage` and `-musage` flags tell Btrfs to only rewrite chunks that are less than 50% full. This frees up allocated-but-mostly-empty space without touching dense chunks.

### Monitoring Balance Progress

Balance operations run in the foreground by default. To run in the background:

```bash
# Start balance in background
sudo btrfs balance start -d -m /mnt/data &

# Check status
sudo btrfs balance status /mnt/data
```

Output shows progress as a percentage of chunks processed:

```
Balance on '/mnt/data' is running
3 out of about 212 chunks balanced (9 considered),  98% left
```

### Pausing and Resuming

If you need to stop a running balance without cancelling it entirely:

```bash
# Pause the balance
sudo btrfs balance pause /mnt/data

# Resume later
sudo btrfs balance resume /mnt/data

# Cancel completely
sudo btrfs balance cancel /mnt/data
```

This is useful when you need the system resources for other tasks and want to continue the balance later.

### Balance After Adding a Device

When you add a new device to a Btrfs pool, the existing data stays on the old devices. A balance redistributes it:

```bash
# Add device
sudo btrfs device add /dev/sdc /mnt/data

# Balance only chunks with low usage to avoid moving everything
sudo btrfs balance start -dusage=75 /mnt/data
```

On systems where write activity is ongoing, run balance during off-peak hours.

### Converting Profiles with Balance

Balance is also the mechanism for changing RAID profiles:

```bash
# Convert data from RAID1 to RAID10 after adding more devices
sudo btrfs balance start -dconvert=raid10 -mconvert=raid10 /mnt/data

# Convert a single-device filesystem to use RAID1 after adding a second device
sudo btrfs balance start -dconvert=raid1 -mconvert=raid1 /mnt/data
```

Check the current allocation profile:

```bash
sudo btrfs filesystem df /mnt/data
```

## Running a Defragment

### Defragmenting a Directory or File

The `btrfs filesystem defragment` command targets files and directories:

```bash
# Defragment a specific file
sudo btrfs filesystem defragment /mnt/data/largefile.img

# Defragment all files in a directory recursively
sudo btrfs filesystem defragment -r /mnt/data/

# Defragment and compress files during the process
sudo btrfs filesystem defragment -r -czstd /mnt/data/
```

The `-c` flag compresses file data during defragmentation. `zstd` is a good default for a balance of compression ratio and speed. Other options are `lzo` (faster, lower ratio) and `zlib` (slower, higher ratio).

### Defragmenting the Entire Filesystem

To defragment at the mount point level:

```bash
sudo btrfs filesystem defragment -r /mnt/data
```

Be aware that this can be very slow on large filesystems and may temporarily increase disk I/O significantly.

### Important Caveat with Snapshots

Defragmenting files that share extents with snapshots breaks that sharing. After defragmentation, both the original file and snapshot will have their own independent copies of the data, increasing space usage. If you rely heavily on Btrfs snapshots, be selective about what you defragment.

```bash
# Check snapshot usage before defragmenting
sudo btrfs subvolume list /mnt/data
```

If you have many snapshots, consider whether the defragmentation benefit outweighs the increased space usage.

## Checking Fragmentation Levels

Before running either operation, assess whether it's actually needed:

```bash
# Check file system usage and allocation
sudo btrfs filesystem usage /mnt/data
```

Pay attention to the ratio of "allocated" vs "used" space. A large gap means poorly utilized chunks that a balance can consolidate.

For file-level fragmentation, inspect specific files:

```bash
# Show extent map for a file (many extents = fragmented)
sudo filefrag -v /mnt/data/largefile.img
```

A file broken into dozens or hundreds of extents benefits from defragmentation. A file in one or two extents does not.

## Automating Maintenance

### Periodic Balance with systemd

Create a systemd service and timer for regular balance operations:

```bash
# Create the service file
sudo tee /etc/systemd/system/btrfs-balance.service <<'EOF'
[Unit]
Description=Btrfs balance for /mnt/data
After=local-fs.target

[Service]
Type=oneshot
# Only balance chunks less than 50% full to keep runtime reasonable
ExecStart=/usr/bin/btrfs balance start -dusage=50 -musage=50 /mnt/data
TimeoutSec=3600
EOF

# Create the timer
sudo tee /etc/systemd/system/btrfs-balance.timer <<'EOF'
[Unit]
Description=Weekly Btrfs balance for /mnt/data

[Timer]
# Run every Sunday at 3am
OnCalendar=Sun *-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable --now btrfs-balance.timer
```

Check that the timer is scheduled:

```bash
systemctl list-timers btrfs-balance.timer
```

### Combining Scrub and Balance

For a comprehensive maintenance routine, run a scrub after each balance to verify data integrity:

```bash
# Create a combined maintenance script
sudo tee /usr/local/bin/btrfs-maintenance.sh <<'EOF'
#!/bin/bash
MOUNT=/mnt/data

echo "Starting Btrfs balance on $MOUNT"
/usr/bin/btrfs balance start -dusage=50 -musage=50 "$MOUNT"

echo "Starting Btrfs scrub on $MOUNT"
/usr/bin/btrfs scrub start -B "$MOUNT"

echo "Maintenance complete"
/usr/bin/btrfs scrub status "$MOUNT"
EOF

sudo chmod +x /usr/local/bin/btrfs-maintenance.sh
```

## Common Mistakes to Avoid

**Running a full balance unnecessarily.** A balance with no filters moves every chunk, which can take hours and causes significant I/O. Always use usage filters unless you have a specific reason not to.

**Defragmenting snapshot-heavy volumes.** As mentioned, this breaks extent sharing and inflates disk usage. Know your snapshot situation before defragmenting aggressively.

**Ignoring balance on single-device setups.** Balance is still useful on single-device Btrfs systems to consolidate fragmented chunk allocations, even without RAID.

**Not monitoring space during balance.** Balance temporarily requires extra space to write new chunks before removing old ones. Make sure you have at least 10-15% free space before starting.

Regular balance and defragment operations keep Btrfs volumes performing well and ensure space is allocated efficiently over time.

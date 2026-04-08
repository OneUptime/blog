# How to Configure MongoDB Storage for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Storage, WiredTiger, Production, Performance

Description: Learn how to configure MongoDB storage for production including WiredTiger cache size, compression, journal settings, and disk I/O optimization.

---

## Storage Configuration Overview

MongoDB's WiredTiger storage engine provides extensive configuration options. Properly tuned storage settings improve throughput, reduce disk usage, and prevent I/O bottlenecks. The three most impactful settings are cache size, compression algorithm, and journal compression.

## Step 1: Configure WiredTiger Cache Size

The WiredTiger cache holds working data in memory. The default is 50% of RAM minus 1GB. For a dedicated MongoDB server, increase this:

```yaml
# /etc/mongod.conf
storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 18  # For a 32GB server: (32 - 8 OS - 4-6 indexes ≈ 18-20)
```

Calculate the appropriate value:

```bash
# For server with 32GB RAM:
# - Leave 8GB for OS and filesystem cache
# - Leave 4-6GB for index working set not in WT cache
# - Remaining 18-20GB for WT cache
# Set cacheSizeGB to 18 for such a server

free -g  # Check available RAM
```

Monitor cache usage to validate your setting:

```javascript
const status = db.adminCommand({ serverStatus: 1 }).wiredTiger.cache;
const usedGB = status["bytes currently in the cache"] / 1024**3;
const maxGB = status["maximum bytes configured"] / 1024**3;
const utilPct = (usedGB / maxGB * 100).toFixed(1);
print(`Cache: ${usedGB.toFixed(1)}GB / ${maxGB.toFixed(1)}GB (${utilPct}%)`);
```

If cache utilization consistently exceeds 90%, increase `cacheSizeGB`.

## Step 2: Configure Data and Index Compression

Enable compression to reduce disk usage and I/O:

```yaml
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: zstd  # Best ratio; use snappy for lower CPU
    indexConfig:
      prefixCompression: true  # Always enable - reduces index size 30-50%
    engineConfig:
      journalCompressor: snappy  # Fast journal writes
```

Compression ratios for different types:

```text
Algorithm  Text/JSON  Numeric  Mixed
snappy     40-60%     20-40%   35-55%
zlib       50-70%     30-50%   45-65%
zstd       55-75%     35-55%   50-70%
```

## Step 3: Configure the Data Directory

Use a dedicated disk for MongoDB data, separate from the OS:

```bash
# Mount dedicated disk for MongoDB
sudo mkfs.ext4 /dev/xvdb
sudo mkdir -p /data/mongodb
sudo mount /dev/xvdb /data/mongodb
sudo chown -R mongod:mongod /data/mongodb

# Add to /etc/fstab for persistence
echo "/dev/xvdb  /data/mongodb  ext4  defaults,noatime  0  2" | sudo tee -a /etc/fstab
```

The `noatime` mount option reduces I/O by not updating access timestamps.

```yaml
# mongod.conf - use the dedicated mount
storage:
  dbPath: /data/mongodb
```

## Step 4: Separate Journal Directory

For high-write workloads, place the journal on a separate disk:

```yaml
storage:
  dbPath: /data/mongodb
  journal:
    commitIntervalMs: 100  # Default 100ms; reduce for durability, increase for throughput
```

To place the journal on a separate disk, create a symlink from the journal subdirectory:

```bash
# Stop mongod first
sudo systemctl stop mongod

# Move journal to a separate SSD and symlink back
sudo mv /data/mongodb/journal /data/journal-ssd/
sudo ln -s /data/journal-ssd/journal /data/mongodb/journal
sudo chown -R mongod:mongod /data/journal-ssd /data/mongodb/journal

sudo systemctl start mongod
```

Placing data and journal on separate SSDs eliminates I/O contention.

## Step 5: Configure Disk I/O Scheduler

Set the I/O scheduler for MongoDB SSDs:

```bash
# For NVMe SSDs, use none (no queuing needed)
echo none > /sys/block/nvme0n1/queue/scheduler

# For SATA SSDs, use mq-deadline (or deadline on older kernels)
echo mq-deadline > /sys/block/sda/queue/scheduler

# Make persistent via udev rule
echo 'ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"' \
  | sudo tee /etc/udev/rules.d/60-mongodb-io.rules
```

## Step 6: Monitor Disk Usage and I/O

Track disk usage to anticipate capacity issues:

```bash
# Check MongoDB disk usage
df -h /data/mongodb

# Check I/O stats for MongoDB disk
iostat -x /dev/xvdb 5 3

# Get collection storage stats
mongosh --eval '
db.getCollectionNames().forEach(name => {
  const stats = db[name].stats();
  print(name + ": " + (stats.storageSize/1024/1024).toFixed(1) + " MB stored, " +
        (stats.size/1024/1024).toFixed(1) + " MB uncompressed");
});
'
```

## Step 7: Plan for Disk Growth

Estimate disk growth to avoid running out of space:

```javascript
// Measure collection growth over 7 days
const stats = db.events.stats();
const storageGB = stats.storageSize / 1024**3;
const docsPerDay = 100000; // Estimated inserts per day
const avgDocSizeBytes = stats.avgObjSize;
const dailyGrowthGB = (docsPerDay * avgDocSizeBytes * 0.4) / 1024**3; // 40% compression

print(`Current storage: ${storageGB.toFixed(2)} GB`);
print(`Estimated daily growth: ${dailyGrowthGB.toFixed(3)} GB/day`);
print(`Days until 1TB full: ${Math.floor((1024 - storageGB) / dailyGrowthGB)}`);
```

## Summary

Configuring MongoDB storage for production requires setting WiredTiger cache to 50-60% of dedicated server RAM, enabling zstd or snappy compression for collections and indexes, using a dedicated disk with `noatime` mounting, separating data and journal directories for high-write workloads, tuning the I/O scheduler for SSDs, and monitoring disk usage to forecast capacity needs before they become emergencies.

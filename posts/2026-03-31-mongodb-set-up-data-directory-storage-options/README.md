# How to Set Up MongoDB Data Directory and Storage Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Storage, Configuration

Description: Learn how to configure the MongoDB data directory and storage engine options to optimize performance and reliability for your database.

---

MongoDB stores all its data in a designated directory on the filesystem. Configuring this directory correctly - along with storage engine settings - is fundamental to a reliable MongoDB deployment.

## Default Data Directory

The `mongod` binary defaults to `/data/db` on Linux and `C:\data\db` on Windows. However, official package installations typically override this to `/var/lib/mongodb` (Debian/Ubuntu) or `/var/lib/mongo` (RHEL/CentOS) via the `mongod.conf` file. You can verify the current path by checking your `mongod.conf`:

```bash
grep -i dbPath /etc/mongod.conf
```

## Setting the Data Directory

Edit `/etc/mongod.conf` to change the storage path:

```text
storage:
  dbPath: /data/mongodb
```

> **Note:** Journaling is always enabled in MongoDB 6.1 and later. The `storage.journal.enabled` option was removed and will cause a startup error if included on modern versions.

Then create the directory and set the correct ownership:

```bash
sudo mkdir -p /data/mongodb
sudo chown -R mongodb:mongodb /data/mongodb
sudo chmod 750 /data/mongodb
```

Restart MongoDB to apply the change:

```bash
sudo systemctl restart mongod
```

## WiredTiger Storage Engine Options

WiredTiger is the default storage engine since MongoDB 3.2. You can tune it in `mongod.conf`:

```text
storage:
  dbPath: /data/mongodb
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
      journalCompressor: snappy
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true
```

Key options explained:
- `cacheSizeGB` - WiredTiger cache size (default is 50% of RAM minus 1 GB)
- `journalCompressor` - compression for journal data (snappy, zlib, zstd, none)
- `blockCompressor` - compression for collection data (snappy, zlib, zstd, none)
- `prefixCompression` - reduces index size on disk

## Moving an Existing Data Directory

To move an existing data directory safely:

```bash
sudo systemctl stop mongod
sudo mv /var/lib/mongodb /data/mongodb
sudo chown -R mongodb:mongodb /data/mongodb
```

Update `mongod.conf` with the new path, then restart:

```bash
sudo systemctl start mongod
```

## Verifying Storage Configuration

From `mongosh`, run `serverStatus` to confirm the active storage engine:

```javascript
db.serverStatus().storageEngine
```

You should see output like:

```text
{
  name: 'wiredTiger',
  supportsCommittedReads: true,
  readOnly: false,
  persistent: true
}
```

## Disk Layout Best Practices

- Place `dbPath` on a dedicated disk or mount point separate from the OS.
- Use XFS or ext4 filesystems on Linux for best performance.
- Disable access time updates (`noatime`) on the mount for reduced I/O.
- Mount the data partition with the `noatime` option in `/etc/fstab`:

```text
/dev/sdb1   /data/mongodb   xfs   defaults,noatime   0   0
```

## Summary

Configuring the MongoDB data directory involves updating `mongod.conf` with the correct `dbPath`, ensuring proper ownership and permissions, and tuning WiredTiger storage options. Placing data on a dedicated filesystem with XFS and `noatime` improves I/O performance significantly.
